/**
 * Auto-Settlement Server for BettingEscrow
 * 
 * EFFICIENT DESIGN (adapted for Monad testnet):
 *   - Monad RPC does NOT support eth_newFilter or large eth_getLogs ranges
 *   - Instead: scans recent 100 blocks for BetPlaced events each cycle
 *   - Only queries PandaScore for matches that have on-chain bets
 *   - Polls every 2 minutes → ~0-5 PandaScore API calls per cycle (max)
 *   - Frontend uses ~60 req/hr → combined total stays well under 900/hr
 * 
 * Run: node server/settlement-server.js
 */

import { ethers } from 'ethers';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// ── Config ──────────────────────────────────────────────────────
const RPC_URL = process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz';
const BETTING_ESCROW_ADDRESS = '0x41d521347068B09bfFE2E2bba9946FC9368c6A17';
const PANDASCORE_TOKEN = 'QlP9wl3Oh5Zl97LiUyFy7HSQ1L4NIZ0McJMYoXf904QIJGoE0bk';
const PANDASCORE_BASE = 'https://api.pandascore.co';
const POLL_INTERVAL_MS = 120_000;  // 2 minutes
const LOG_SCAN_RANGE = 99;         // Monad limits eth_getLogs to 100 blocks

// ── ABI ─────────────────────────────────────────────────────────
const ESCROW_ABI = [
    'function settleMatch(uint256 matchId, uint256 winnerTeamId) external',
    'function cancelMatch(uint256 matchId) external',
    'function matches(uint256) view returns (uint256 teamAId, uint256 teamBId, uint256 teamATotal, uint256 teamBTotal, uint256 winnerTeamId, bool settled, bool cancelled, bool exists)',
    'event BetPlaced(uint256 indexed matchId, address indexed bettor, uint256 teamId, uint256 amount)',
    'event MatchCreated(uint256 indexed matchId, uint256 teamAId, uint256 teamBId)',
    'event MatchSettled(uint256 indexed matchId, uint256 winnerTeamId, uint256 totalPool, uint256 fee)',
];

// ── Setup ────────────────────────────────────────────────────────
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(process.env.TRADING_WALLET_PRIVATE_KEY, provider);
const escrow = new ethers.Contract(BETTING_ESCROW_ADDRESS, ESCROW_ABI, wallet);

// Track state
const activeMatchIds = new Set();     // Matches with bets, not yet settled
const settledMatchIds = new Set();    // Already settled — skip forever
const processingMatchIds = new Set(); // Currently in a tx — prevent doubled
let lastScannedBlock = 0;             // Track where we left off scanning
let apiCallCount = 0;

// ── Logging ──────────────────────────────────────────────────────
function log(level, msg, data = {}) {
    const ts = new Date().toISOString();
    const icon = { info: '🟢', warn: '🟡', error: '🔴', settle: '💰' }[level] || '📋';
    const extra = Object.keys(data).length > 0 ? ' ' + JSON.stringify(data) : '';
    console.log(`[${ts}] ${icon} ${msg}${extra}`);
}

// ── PandaScore (single-match fetch — 1 API call each) ───────────
async function fetchMatchById(matchId) {
    try {
        apiCallCount++;
        const res = await fetch(`${PANDASCORE_BASE}/matches/${matchId}?token=${PANDASCORE_TOKEN}`);
        if (!res.ok) {
            if (res.status === 429) { log('warn', 'Rate limited'); return null; }
            if (res.status === 404) return null;
            return null;
        }
        return res.json();
    } catch (err) {
        log('error', `PandaScore fetch failed for ${matchId}`, { error: err.message });
        return null;
    }
}

// ── Event Scanning (Monad-compatible: ≤100 block range) ─────────
async function scanRecentEvents() {
    try {
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = lastScannedBlock > 0
            ? lastScannedBlock + 1
            : Math.max(0, currentBlock - LOG_SCAN_RANGE);

        // Nothing new to scan
        if (fromBlock > currentBlock) return;

        // Chunk into 99-block ranges (Monad limit)
        for (let start = fromBlock; start <= currentBlock; start += LOG_SCAN_RANGE) {
            const end = Math.min(start + LOG_SCAN_RANGE - 1, currentBlock);

            try {
                // Scan for BetPlaced events
                const betFilter = escrow.filters.BetPlaced();
                const betEvents = await escrow.queryFilter(betFilter, start, end);
                for (const event of betEvents) {
                    const matchId = Number(event.args[0]);
                    if (!settledMatchIds.has(matchId)) {
                        activeMatchIds.add(matchId);
                    }
                }

                // Scan for MatchSettled events
                const settledFilter = escrow.filters.MatchSettled();
                const settledEvents = await escrow.queryFilter(settledFilter, start, end);
                for (const event of settledEvents) {
                    const matchId = Number(event.args[0]);
                    settledMatchIds.add(matchId);
                    activeMatchIds.delete(matchId);
                }
            } catch (err) {
                // Some ranges may fail — that's ok, we'll catch up next cycle
                log('warn', `Log scan failed for blocks ${start}-${end}`, { error: err.message });
            }
        }

        lastScannedBlock = currentBlock;
    } catch (err) {
        log('error', 'Block scan failed', { error: err.message });
    }
}

// ── Settlement ──────────────────────────────────────────────────
async function settleMatchOnChain(matchId, winnerTeamId, matchName) {
    if (processingMatchIds.has(matchId)) return;
    processingMatchIds.add(matchId);

    try {
        log('settle', `Settling: ${matchName}`, { matchId, winnerTeamId });
        const tx = await escrow.settleMatch(matchId, winnerTeamId);
        log('info', `Tx sent: ${tx.hash}`);

        const receipt = await tx.wait();
        if (receipt.status === 1) {
            log('settle', `✅ Settled! Winners paid.`, { matchId, matchName, txHash: tx.hash });
            settledMatchIds.add(matchId);
            activeMatchIds.delete(matchId);
        } else {
            log('error', `Tx reverted`, { matchId });
        }
    } catch (err) {
        const msg = err.message || '';
        if (msg.includes('Already settled') || msg.includes('does not exist')) {
            settledMatchIds.add(matchId);
            activeMatchIds.delete(matchId);
        } else {
            log('error', `Settle failed: ${matchId}`, { error: msg.slice(0, 200) });
        }
    } finally {
        processingMatchIds.delete(matchId);
    }
}

async function cancelMatchOnChain(matchId, matchName) {
    if (processingMatchIds.has(matchId)) return;
    processingMatchIds.add(matchId);

    try {
        log('warn', `Cancelling: ${matchName}`, { matchId });
        const tx = await escrow.cancelMatch(matchId);
        const receipt = await tx.wait();
        if (receipt.status === 1) {
            log('settle', `✅ Cancelled, bets refunded`, { matchId });
            settledMatchIds.add(matchId);
            activeMatchIds.delete(matchId);
        }
    } catch (err) {
        const msg = err.message || '';
        if (msg.includes('settled') || msg.includes('cancelled') || msg.includes('does not exist')) {
            settledMatchIds.add(matchId);
            activeMatchIds.delete(matchId);
        } else {
            log('error', `Cancel failed: ${matchId}`, { error: msg.slice(0, 200) });
        }
    } finally {
        processingMatchIds.delete(matchId);
    }
}

// ── Main Poll Loop ──────────────────────────────────────────────
async function pollAndSettle() {
    // Step 1: Scan chain for new bets (uses RPC only, no PandaScore)
    await scanRecentEvents();

    const unsettled = [...activeMatchIds];
    if (unsettled.length === 0) {
        log('info', `No active bets to check (PandaScore calls: ${apiCallCount})`);
        return;
    }

    log('info', `Checking ${unsettled.length} match(es) with bets...`, { matchIds: unsettled });

    // Step 2: For each active match, check PandaScore status (1 API call per match)
    for (const matchId of unsettled) {
        if (settledMatchIds.has(matchId)) continue;

        // Verify still unsettled on-chain
        let onChain;
        try {
            onChain = await escrow.matches(matchId);
        } catch { continue; }

        if (!onChain.exists || onChain.settled || onChain.cancelled) {
            settledMatchIds.add(matchId);
            activeMatchIds.delete(matchId);
            continue;
        }

        // Query PandaScore for this specific match
        const match = await fetchMatchById(matchId);
        if (!match) continue;

        if (match.status === 'finished' && match.winner_id) {
            const winnerId = match.winner_id;
            if (BigInt(winnerId) === onChain.teamAId || BigInt(winnerId) === onChain.teamBId) {
                await settleMatchOnChain(matchId, winnerId, match.name || `Match #${matchId}`);
                await new Promise(r => setTimeout(r, 2000)); // Nonce safety
            } else {
                log('error', `Winner mismatch for ${matchId}`, {
                    pandaWinner: winnerId,
                    chainA: onChain.teamAId.toString(),
                    chainB: onChain.teamBId.toString(),
                });
            }
        } else if (match.status === 'finished' && match.draw) {
            await cancelMatchOnChain(matchId, match.name || `Match #${matchId}`);
            await new Promise(r => setTimeout(r, 2000));
        } else if (match.status === 'canceled' || match.status === 'postponed') {
            await cancelMatchOnChain(matchId, match.name || `Match #${matchId}`);
            await new Promise(r => setTimeout(r, 2000));
        }
        // still running / not_started → skip, check again next poll
    }

    log('info', `Poll done`, {
        active: activeMatchIds.size,
        settled: settledMatchIds.size,
        pandaCalls: apiCallCount,
    });
}

// ── Startup ─────────────────────────────────────────────────────
async function start() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║    🎯 BettingEscrow Auto-Settlement Server      ║');
    console.log('║    ⚡ Efficient: Event-scan + targeted API calls  ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Escrow:  ${BETTING_ESCROW_ADDRESS}  ║`);
    console.log(`║  Poll:    Every ${POLL_INTERVAL_MS / 1000}s                           ║`);
    console.log(`║  Strategy: Scan chain events → query only those  ║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    try {
        log('info', `Wallet: ${wallet.address}`);
        const bal = await provider.getBalance(wallet.address);
        log('info', `MON balance: ${ethers.formatEther(bal)} MON`);
    } catch (err) {
        log('error', 'Wallet connection failed', { error: err.message });
        process.exit(1);
    }

    // Initial poll
    await pollAndSettle();

    // Schedule recurring
    setInterval(pollAndSettle, POLL_INTERVAL_MS);

    log('info', 'Server running. Waiting for bets...');
}

// ── HTTP Health Check Server ─────────────────────────────────────
const app = express();
app.use(cors());

app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        server: 'settlement-server',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        activeMatches: activeMatchIds.size,
        settledMatches: settledMatchIds.size
    });
});

const HTTP_PORT = 3002;
app.listen(HTTP_PORT, () => {
    console.log(`🌐 Health endpoint running on port ${HTTP_PORT}`);
});

start().catch(err => {
    log('error', 'Fatal', { error: err.message });
    process.exit(1);
});
