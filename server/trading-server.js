/**
 * Local Trading Server V3 - SMART TRADING
 * 
 * Features:
 * - REAL on-chain trades via AgentVaultV2
 * - Position tracking (knows what tokens agent holds)
 * - Smart trading decisions: BUY on dips, SELL on highs
 * - Deep trading knowledge embedded
 * 
 * Run: node server/trading-server.js
 */

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Contract addresses (Monad Testnet)
const CONTRACTS = {
    USDC: '0xE5C0a7AB54002FeDfF0Ca7082d242F9D04265f3b',
    AGENT_VAULT_V2: '0x50646200817C52BFa61a5398b3C6dcf217b606Cf',
    SIMPLE_DEX: '0x7f09C84a42A5f881d8cebC3c319DC108c20eE762',
    TEST_BTC: '0x8C56E4d502C544556b76bbC4b8f7E7Fc58511c87',
    TEST_ETH: '0x3809C6E3512c409Ded482240Bd1005c1c40fE5e4',
    TEST_SOL: '0xD02dB25175f69A1b1A03d6F6a8d4A566a99061Af',
};

// Token info
const TOKENS = {
    bitcoin: { address: CONTRACTS.TEST_BTC, decimals: 8, symbol: 'tBTC' },
    ethereum: { address: CONTRACTS.TEST_ETH, decimals: 18, symbol: 'tETH' },
    solana: { address: CONTRACTS.TEST_SOL, decimals: 9, symbol: 'tSOL' },
};

// AgentVaultV2 ABI
const AGENT_VAULT_V2_ABI = [
    'function executeBuy(bytes32 agentId, address user, address token, uint256 usdcAmount, uint256 minTokensOut) external returns (uint256)',
    'function executeSell(bytes32 agentId, address user, address token, uint256 tokenAmount, uint256 minUsdcOut) external returns (uint256)',
    'function getUserAgentBalance(address user, bytes32 agentId) external view returns (uint256)',
    'function getUserAgentTokenBalance(address user, bytes32 agentId, address token) external view returns (uint256)',
    'function operator() external view returns (address)',
];

const ERC20_ABI = [
    'function balanceOf(address account) external view returns (uint256)',
];

// Setup provider and wallet
const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz');
const wallet = new ethers.Wallet(process.env.TRADING_WALLET_PRIVATE_KEY, provider);

console.log(`🔑 Trading wallet (operator): ${wallet.address}`);

// Convert UUID to bytes32
function uuidToBytes32(uuid) {
    const hex = uuid.replace(/-/g, '');
    return '0x' + hex.padEnd(64, '0');
}

/**
 * SMART TRADING DECISION ENGINE
 * Makes BUY/SELL/HOLD decisions based on:
 * - Current price movement
 * - Agent's token holdings
 * - Agent DNA traits
 */
function makeSmartDecision(marketData, positions, agentDNA) {
    const { priceChange24h, priceChange7d, currentPrice, high24h, low24h } = marketData;
    const { hasPosition, tokenAmount, tokenValueUSD } = positions;

    // Calculate price position in 24h range (0-100%)
    const range24h = high24h - low24h;
    const pricePosition = range24h > 0 ? ((currentPrice - low24h) / range24h * 100) : 50;

    // Adjust thresholds based on agent DNA
    const aggressionFactor = (agentDNA?.aggression || 50) / 100;
    const riskFactor = (agentDNA?.riskTolerance || 50) / 100;
    const contrarianFactor = (agentDNA?.contrarianBias || 50) / 100;

    // Thresholds adjusted by DNA - MORE AGGRESSIVE
    const buyThreshold = -1 + (contrarianFactor * 1); // Buy on smaller dips (-1% to 0%)
    const sellThreshold = 2 - (aggressionFactor * 1);  // Sell at smaller profits (1% to 2%)
    const pricePositionBuyThreshold = 45 + (contrarianFactor * 15); // Buy when below 45-60% of range
    const pricePositionSellThreshold = 55 - (aggressionFactor * 10); // Sell when above 45-55% of range

    let action = 'HOLD';
    let confidence = 50;
    let reasoning = '';
    let suggestedAmount = 0;

    // RULE 1: Can only SELL if we have tokens
    if (!hasPosition || tokenAmount === 0) {
        // No position - can only BUY or HOLD

        // BUY CONDITIONS:
        // 1. Price dropped significantly (buy the dip)
        // 2. Price is in the lower part of 24h range
        // 3. 7-day trend suggests recovery potential

        if (priceChange24h <= buyThreshold) {
            action = 'BUY';
            confidence = Math.min(90, 60 + Math.abs(priceChange24h) * 5);
            reasoning = `Price dipped ${priceChange24h.toFixed(2)}% in 24h - buying the dip opportunity`;
            suggestedAmount = 10 + (aggressionFactor * 20); // 10-30% based on aggression
        } else if (pricePosition < pricePositionBuyThreshold) {
            action = 'BUY';
            confidence = Math.min(80, 55 + (pricePositionBuyThreshold - pricePosition));
            reasoning = `Price at ${pricePosition.toFixed(0)}% of 24h range (near daily low) - good entry point`;
            suggestedAmount = 10 + (aggressionFactor * 15); // 10-25%
        } else if (priceChange7d && priceChange7d < -10 && priceChange24h > 0) {
            action = 'BUY';
            confidence = 65;
            reasoning = `7-day drop of ${priceChange7d.toFixed(1)}% but 24h recovery starting - accumulation opportunity`;
            suggestedAmount = 15;
        } else {
            action = 'HOLD';
            confidence = 60;
            reasoning = `No position held. Price stable at ${pricePosition.toFixed(0)}% of daily range - waiting for better entry`;
            suggestedAmount = 0;
        }
    } else {
        // We HAVE a position - can BUY more, SELL, or HOLD

        // SELL CONDITIONS:
        // 1. Price increased significantly (take profit)
        // 2. Price is at the high of 24h range

        if (priceChange24h >= sellThreshold) {
            action = 'SELL';
            confidence = Math.min(90, 60 + priceChange24h * 3);
            reasoning = `Price up ${priceChange24h.toFixed(2)}% in 24h - taking profits on ${tokenAmount.toFixed(6)} tokens`;
            suggestedAmount = 50 + (aggressionFactor * 50); // Sell 50-100% of position
        } else if (pricePosition > pricePositionSellThreshold) {
            action = 'SELL';
            confidence = Math.min(85, 55 + (pricePosition - pricePositionSellThreshold));
            reasoning = `Price at ${pricePosition.toFixed(0)}% of 24h range (near daily high) - selling to lock profits`;
            suggestedAmount = 30 + (aggressionFactor * 40); // Sell 30-70%
        } else if (priceChange24h < -8) {
            // Stop loss - significant drop while holding
            action = 'SELL';
            confidence = 75;
            reasoning = `Price dropped ${Math.abs(priceChange24h).toFixed(2)}% - cutting losses`;
            suggestedAmount = 100; // Sell all
        } else if (priceChange24h <= buyThreshold * 1.5) {
            // DCA - buy more on bigger dip
            action = 'BUY';
            confidence = 65;
            reasoning = `Already holding ${tokenAmount.toFixed(6)} tokens, but price dipped ${priceChange24h.toFixed(2)}% - DCA opportunity`;
            suggestedAmount = 10; // Small additional buy
        } else {
            // Instead of just HOLD, make a small trade to keep activity going
            // Random factor - 30% chance to do something even in neutral market
            if (Math.random() < 0.3) {
                action = priceChange24h > 0 ? 'SELL' : 'BUY';
                confidence = 45;
                reasoning = `Market neutral but taking small ${action} action. Holding ${tokenAmount.toFixed(4)} tokens.`;
                suggestedAmount = 10; // Small trade
            } else {
                action = 'HOLD';
                confidence = 55;
                reasoning = `Holding ${tokenAmount.toFixed(4)} tokens ($${tokenValueUSD.toFixed(2)}). Waiting for clearer signals.`;
                suggestedAmount = 0;
            }
        }
    }

    return {
        action,
        confidence,
        reasoning,
        suggestedAmount,
        technicalAnalysis: `24h: ${priceChange24h >= 0 ? '+' : ''}${priceChange24h.toFixed(2)}%, Position in range: ${pricePosition.toFixed(0)}%`,
        riskAssessment: action === 'BUY' ? 'Entry risk managed by position sizing' :
            action === 'SELL' ? 'Profit taking to reduce exposure' : 'Waiting for clearer signal',
    };
}

/**
 * Fetch market data from CoinGecko
 */
async function fetchMarketData(symbol) {
    try {
        const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/${symbol}?localization=false&tickers=false&community_data=false&developer_data=false`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch market data');
        }

        const data = await response.json();
        return {
            symbol: data.symbol.toUpperCase(),
            currentPrice: data.market_data.current_price.usd,
            priceChange24h: data.market_data.price_change_percentage_24h || 0,
            priceChange7d: data.market_data.price_change_percentage_7d || 0,
            high24h: data.market_data.high_24h.usd || 0,
            low24h: data.market_data.low_24h.usd || 0,
            volume24h: data.market_data.total_volume.usd || 0,
        };
    } catch (error) {
        console.error('Market data fetch error:', error);
        return null;
    }
}

/**
 * Get agent's positions from AgentVaultV2
 */
async function getAgentPositions(userAddress, agentId, tokenAddress, tokenDecimals) {
    const agentVault = new ethers.Contract(CONTRACTS.AGENT_VAULT_V2, AGENT_VAULT_V2_ABI, wallet);
    const agentIdBytes32 = uuidToBytes32(agentId);

    // Get USDC balance
    const usdcBalance = await agentVault.getUserAgentBalance(userAddress, agentIdBytes32);
    const usdcAmount = parseFloat(ethers.formatUnits(usdcBalance, 6));

    // Get token balance
    const tokenBalance = await agentVault.getUserAgentTokenBalance(userAddress, agentIdBytes32, tokenAddress);
    const tokenAmount = parseFloat(ethers.formatUnits(tokenBalance, tokenDecimals));

    return {
        usdcBalance: usdcAmount,
        tokenAmount,
        hasPosition: tokenAmount > 0,
    };
}

/**
 * SMART TRADE ENDPOINT
 * Makes intelligent decisions and executes real on-chain trades
 */
app.post('/api/smart-trade', async (req, res) => {
    try {
        const { symbol, agentId, userAddress, agentDNA } = req.body;

        console.log(`\n${'='.repeat(60)}`);
        console.log(`🧠 SMART TRADE for ${symbol}`);
        console.log(`   Agent: ${agentId}`);
        console.log(`   User: ${userAddress}`);

        if (!agentId || !userAddress) {
            return res.status(400).json({ error: 'agentId and userAddress required' });
        }

        const tokenInfo = TOKENS[symbol];
        if (!tokenInfo) {
            return res.status(400).json({ error: 'Unsupported token', symbol });
        }

        // 1. Fetch market data
        console.log(`📊 Fetching market data for ${symbol}...`);
        const marketData = await fetchMarketData(symbol);
        if (!marketData) {
            return res.status(500).json({ error: 'Failed to fetch market data' });
        }
        console.log(`   Price: $${marketData.currentPrice}, 24h: ${marketData.priceChange24h.toFixed(2)}%`);

        // 2. Get agent's current positions
        console.log(`💼 Fetching agent positions...`);
        const positions = await getAgentPositions(userAddress, agentId, tokenInfo.address, tokenInfo.decimals);
        positions.tokenValueUSD = positions.tokenAmount * marketData.currentPrice;
        console.log(`   USDC: $${positions.usdcBalance.toFixed(2)}, ${tokenInfo.symbol}: ${positions.tokenAmount.toFixed(8)}`);

        // 3. Make smart trading decision
        console.log(`🧠 Making decision...`);
        const decision = makeSmartDecision(marketData, positions, agentDNA);
        console.log(`   Decision: ${decision.action} (${decision.confidence}% confidence)`);
        console.log(`   Reason: ${decision.reasoning}`);

        // 4. Execute trade if not HOLD
        let txHash = null;
        let newBalance = positions.usdcBalance;
        let tokensTraded = 0;

        if (decision.action !== 'HOLD' && decision.confidence >= 55) {
            const agentVault = new ethers.Contract(CONTRACTS.AGENT_VAULT_V2, AGENT_VAULT_V2_ABI, wallet);
            const agentIdBytes32 = uuidToBytes32(agentId);

            if (decision.action === 'BUY' && positions.usdcBalance > 0) {
                // Calculate buy amount
                const buyAmount = positions.usdcBalance * (decision.suggestedAmount / 100);
                const amountIn = ethers.parseUnits(buyAmount.toFixed(6), 6);

                console.log(`🛒 Executing BUY: $${buyAmount.toFixed(2)} USDC → ${tokenInfo.symbol}`);

                try {
                    const buyTx = await agentVault.executeBuy(
                        agentIdBytes32,
                        userAddress,
                        tokenInfo.address,
                        amountIn,
                        0
                    );
                    const receipt = await buyTx.wait();
                    txHash = receipt.hash;
                    console.log(`✅ BUY executed! Tx: ${txHash}`);
                } catch (buyError) {
                    console.error(`❌ BUY failed:`, buyError.message);
                }

            } else if (decision.action === 'SELL' && positions.hasPosition) {
                // Calculate sell amount
                const sellPercent = decision.suggestedAmount / 100;
                const sellAmount = positions.tokenAmount * sellPercent;
                const amountIn = ethers.parseUnits(sellAmount.toFixed(tokenInfo.decimals), tokenInfo.decimals);

                console.log(`💱 Executing SELL: ${sellAmount.toFixed(8)} ${tokenInfo.symbol} → USDC`);

                try {
                    const sellTx = await agentVault.executeSell(
                        agentIdBytes32,
                        userAddress,
                        tokenInfo.address,
                        amountIn,
                        0
                    );
                    const receipt = await sellTx.wait();
                    txHash = receipt.hash;
                    tokensTraded = sellAmount;
                    console.log(`✅ SELL executed! Tx: ${txHash}`);
                } catch (sellError) {
                    console.error(`❌ SELL failed:`, sellError.message);
                }
            }

            // Refresh balances
            if (txHash) {
                const newPositions = await getAgentPositions(userAddress, agentId, tokenInfo.address, tokenInfo.decimals);
                newBalance = newPositions.usdcBalance;
            }
        }

        res.json({
            success: true,
            decision,
            marketData,
            positions,
            trade: {
                executed: !!txHash,
                txHash,
                newBalance,
                tokensTraded,
            }
        });

    } catch (error) {
        console.error('❌ Smart trade error:', error);
        res.status(500).json({
            error: 'Trade failed',
            details: error.message,
        });
    }
});

/**
 * Legacy execute-trade endpoint (still works with AgentVaultV2)
 */
app.post('/api/execute-trade', async (req, res) => {
    try {
        const { action, symbol, amountUSDC, agentId, userAddress } = req.body;

        console.log(`\n${'='.repeat(50)}`);
        console.log(`📊 Executing ${action} for ${amountUSDC} USDC on ${symbol}`);

        if (!agentId || !userAddress) {
            return res.status(400).json({ error: 'agentId and userAddress required' });
        }

        const tokenInfo = TOKENS[symbol];
        if (!tokenInfo) {
            return res.status(400).json({ error: 'Unsupported token', symbol });
        }

        const agentVault = new ethers.Contract(CONTRACTS.AGENT_VAULT_V2, AGENT_VAULT_V2_ABI, wallet);
        const agentIdBytes32 = uuidToBytes32(agentId);

        let txHash = null;

        if (action === 'BUY') {
            const amountIn = ethers.parseUnits(amountUSDC.toFixed(6), 6);
            console.log(`🛒 Buying ${tokenInfo.symbol} via AgentVaultV2...`);
            const buyTx = await agentVault.executeBuy(
                agentIdBytes32, userAddress, tokenInfo.address, amountIn, 0
            );
            const receipt = await buyTx.wait();
            txHash = receipt.hash;
            console.log(`✅ BUY complete! Tx: ${txHash}`);

        } else if (action === 'SELL') {
            const tokenBalance = await agentVault.getUserAgentTokenBalance(userAddress, agentIdBytes32, tokenInfo.address);
            if (tokenBalance === 0n) {
                return res.status(400).json({ error: `No ${tokenInfo.symbol} to sell` });
            }
            console.log(`💱 Selling ${tokenInfo.symbol} via AgentVaultV2...`);
            const sellTx = await agentVault.executeSell(
                agentIdBytes32, userAddress, tokenInfo.address, tokenBalance, 0
            );
            const receipt = await sellTx.wait();
            txHash = receipt.hash;
            console.log(`✅ SELL complete! Tx: ${txHash}`);
        }

        const newBalance = await agentVault.getUserAgentBalance(userAddress, agentIdBytes32);

        res.json({
            success: true,
            action,
            symbol: tokenInfo.symbol,
            txHash,
            newBalance: parseFloat(ethers.formatUnits(newBalance, 6)),
        });

    } catch (error) {
        console.error('❌ Trade error:', error);
        res.status(500).json({ error: 'Trade failed', details: error.message });
    }
});

/**
 * Get agent balances
 */
app.get('/api/agent-balances/:userAddress/:agentId', async (req, res) => {
    try {
        const { userAddress, agentId } = req.params;
        const agentVault = new ethers.Contract(CONTRACTS.AGENT_VAULT_V2, AGENT_VAULT_V2_ABI, wallet);
        const agentIdBytes32 = uuidToBytes32(agentId);

        const usdcBalance = await agentVault.getUserAgentBalance(userAddress, agentIdBytes32);

        const tokenBalances = {};
        for (const [name, info] of Object.entries(TOKENS)) {
            const balance = await agentVault.getUserAgentTokenBalance(userAddress, agentIdBytes32, info.address);
            tokenBalances[info.symbol] = parseFloat(ethers.formatUnits(balance, info.decimals));
        }

        res.json({
            agentId,
            userAddress,
            usdc: parseFloat(ethers.formatUnits(usdcBalance, 6)),
            tokens: tokenBalances
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Health check
 */
app.get('/api/health', async (req, res) => {
    try {
        const agentVault = new ethers.Contract(CONTRACTS.AGENT_VAULT_V2, AGENT_VAULT_V2_ABI, wallet);
        const operator = await agentVault.operator();

        res.json({
            status: 'ok',
            version: 'V3-SMART',
            tradingWallet: wallet.address,
            isOperator: operator.toLowerCase() === wallet.address.toLowerCase(),
            contracts: {
                agentVaultV2: CONTRACTS.AGENT_VAULT_V2,
                simpleDex: CONTRACTS.SIMPLE_DEX,
            },
            features: ['smart-trading', 'position-tracking', 'buy-low-sell-high']
        });
    } catch (error) {
        res.status(500).json({ status: 'error', error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Trading Server V3 - SMART TRADING`);
    console.log(`   Port: ${PORT}`);
    console.log(`   Operator: ${wallet.address}`);
    console.log(`   AgentVaultV2: ${CONTRACTS.AGENT_VAULT_V2}`);
    console.log(`   Features:`);
    console.log(`   ✅ Position tracking (knows what tokens agent holds)`);
    console.log(`   ✅ Smart decisions (BUY on dips, SELL on highs)`);
    console.log(`   ✅ DNA-based trading style`);
    console.log(`${'='.repeat(60)}\n`);
});
