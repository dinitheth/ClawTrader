/**
 * Check SimpleDEX pool status
 * Run: node server/check-dex.js
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const CONTRACTS = {
    USDC: '0xE5C0a7AB54002FeDfF0Ca7082d242F9D04265f3b',
    SIMPLE_DEX: '0x7f09C84a42A5f881d8cebC3c319DC108c20eE762',
    TEST_BTC: '0x8C56E4d502C544556b76bbC4b8f7E7Fc58511c87',
    TEST_ETH: '0x3809C6E3512c409Ded482240Bd1005c1c40fE5e4',
    TEST_SOL: '0xD02dB25175f69A1b1A03d6F6a8d4A566a99061Af',
};

const DEX_ABI = [
    'function getPrice(address token) external view returns (uint256)',
    'function getPoolBalance(address token) external view returns (uint256)',
    'function isTokenSupported(address token) external view returns (bool)',
    'function tokenDecimals(address token) external view returns (uint8)',
    'function priceUpdater() external view returns (address)',
    'function owner() external view returns (address)',
];

const ERC20_ABI = [
    'function balanceOf(address account) external view returns (uint256)',
    'function decimals() external view returns (uint8)',
    'function symbol() external view returns (string)',
];

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL || 'https://rpc.ankr.com/monad_testnet');
    const dex = new ethers.Contract(CONTRACTS.SIMPLE_DEX, DEX_ABI, provider);

    console.log('=== SimpleDEX Status Check ===\n');
    console.log(`DEX Address: ${CONTRACTS.SIMPLE_DEX}`);

    try {
        const owner = await dex.owner();
        const priceUpdater = await dex.priceUpdater();
        console.log(`Owner: ${owner}`);
        console.log(`Price Updater: ${priceUpdater}\n`);
    } catch (e) {
        console.log('Could not fetch owner/priceUpdater:', e.message);
    }

    // Check USDC in pool
    const usdc = new ethers.Contract(CONTRACTS.USDC, ERC20_ABI, provider);
    const dexUsdcBalance = await usdc.balanceOf(CONTRACTS.SIMPLE_DEX);
    console.log(`DEX USDC Balance: ${ethers.formatUnits(dexUsdcBalance, 6)} USDC\n`);

    const tokens = [
        { name: 'TestBTC', address: CONTRACTS.TEST_BTC, expectedDec: 8 },
        { name: 'TestETH', address: CONTRACTS.TEST_ETH, expectedDec: 18 },
        { name: 'TestSOL', address: CONTRACTS.TEST_SOL, expectedDec: 9 },
    ];

    for (const token of tokens) {
        console.log(`--- ${token.name} (${token.address}) ---`);

        try {
            const isSupported = await dex.isTokenSupported(token.address);
            console.log(`  Supported: ${isSupported}`);

            if (isSupported) {
                const price = await dex.getPrice(token.address);
                const poolBalance = await dex.getPoolBalance(token.address);
                const decimals = await dex.tokenDecimals(token.address);

                console.log(`  Price: ${ethers.formatUnits(price, 6)} USDC per token`);
                console.log(`  Pool Balance: ${ethers.formatUnits(poolBalance, decimals)} tokens`);
                console.log(`  Decimals: ${decimals}`);
            } else {
                console.log(`  ⚠️ Token NOT supported in DEX!`);
            }
        } catch (e) {
            console.log(`  Error: ${e.message}`);
        }
        console.log('');
    }
}

main().catch(console.error);
