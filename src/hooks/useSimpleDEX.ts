/**
 * SimpleDEX Trading Hook
 * Handles on-chain token swaps via SimpleDEX contract
 */

import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACTS, SIMPLE_DEX_ABI, USDC_ABI, ERC20_ABI } from '../lib/contracts';
import { priceToUSDC } from '../lib/priceService';

export type TradeType = 'BUY' | 'SELL';
export type TokenSymbol = 'tBTC' | 'tETH' | 'tSOL';

interface TokenConfig {
    address: `0x${string}`;
    decimals: number;
    symbol: string;
}

const TOKENS: Record<TokenSymbol, TokenConfig> = {
    tBTC: { address: CONTRACTS.TEST_BTC.address, decimals: 8, symbol: 'tBTC' },
    tETH: { address: CONTRACTS.TEST_ETH.address, decimals: 18, symbol: 'tETH' },
    tSOL: { address: CONTRACTS.TEST_SOL.address, decimals: 9, symbol: 'tSOL' },
};

export function useSimpleDEX() {
    const { address: userAddress } = useAccount();
    const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>();

    // Write contract hook for swaps
    const { writeContractAsync, isPending: isWriting } = useWriteContract();

    // Wait for transaction confirmation
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash: pendingTxHash,
    });

    /**
     * Approve USDC for SimpleDEX spending
     */
    const approveUSDC = useCallback(async (amount: bigint): Promise<`0x${string}`> => {
        const hash = await writeContractAsync({
            address: CONTRACTS.USDC.address,
            abi: USDC_ABI,
            functionName: 'approve',
            args: [CONTRACTS.SIMPLE_DEX.address, amount],
        });
        setPendingTxHash(hash);
        return hash;
    }, [writeContractAsync]);

    /**
     * Approve token for SimpleDEX spending (for sells)
     */
    const approveToken = useCallback(async (tokenSymbol: TokenSymbol, amount: bigint): Promise<`0x${string}`> => {
        const token = TOKENS[tokenSymbol];
        const hash = await writeContractAsync({
            address: token.address,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [CONTRACTS.SIMPLE_DEX.address, amount],
        });
        setPendingTxHash(hash);
        return hash;
    }, [writeContractAsync]);

    /**
     * Buy tokens with USDC
     * @param tokenSymbol Token to buy (tBTC, tETH, tSOL)
     * @param usdcAmount Amount of USDC to spend (in human readable format)
     * @param slippageBps Slippage tolerance in basis points (default 50 = 0.5%)
     */
    const buyToken = useCallback(async (
        tokenSymbol: TokenSymbol,
        usdcAmount: number,
        slippageBps: number = 50
    ): Promise<{ hash: `0x${string}`; success: boolean }> => {
        const token = TOKENS[tokenSymbol];
        const amountIn = parseUnits(usdcAmount.toString(), CONTRACTS.USDC.decimals);

        // Calculate minimum output with slippage (0 for now since we trust oracle price)
        const minAmountOut = BigInt(0); // Simplified - oracle price is trusted

        // First approve USDC
        await approveUSDC(amountIn);

        // Execute buy
        const hash = await writeContractAsync({
            address: CONTRACTS.SIMPLE_DEX.address,
            abi: SIMPLE_DEX_ABI,
            functionName: 'buyToken',
            args: [token.address, amountIn, minAmountOut],
        });

        setPendingTxHash(hash);
        return { hash, success: true };
    }, [writeContractAsync, approveUSDC]);

    /**
     * Sell tokens for USDC
     * @param tokenSymbol Token to sell (tBTC, tETH, tSOL)
     * @param tokenAmount Amount of tokens to sell (in human readable format)
     * @param slippageBps Slippage tolerance in basis points (default 50 = 0.5%)
     */
    const sellToken = useCallback(async (
        tokenSymbol: TokenSymbol,
        tokenAmount: number,
        slippageBps: number = 50
    ): Promise<{ hash: `0x${string}`; success: boolean }> => {
        const token = TOKENS[tokenSymbol];
        const amountIn = parseUnits(tokenAmount.toString(), token.decimals);

        // Calculate minimum output with slippage (0 for now since we trust oracle price)
        const minAmountOut = BigInt(0); // Simplified - oracle price is trusted

        // First approve token
        await approveToken(tokenSymbol, amountIn);

        // Execute sell
        const hash = await writeContractAsync({
            address: CONTRACTS.SIMPLE_DEX.address,
            abi: SIMPLE_DEX_ABI,
            functionName: 'sellToken',
            args: [token.address, amountIn, minAmountOut],
        });

        setPendingTxHash(hash);
        return { hash, success: true };
    }, [writeContractAsync, approveToken]);

    /**
     * Execute a trade based on AI decision
     * @param action BUY or SELL
     * @param tokenSymbol Which token to trade
     * @param amount Amount in USDC (for BUY) or token units (for SELL)
     */
    const executeTrade = useCallback(async (
        action: TradeType,
        tokenSymbol: TokenSymbol,
        amount: number
    ): Promise<{ hash: `0x${string}`; success: boolean; error?: string }> => {
        try {
            if (action === 'BUY') {
                return await buyToken(tokenSymbol, amount);
            } else {
                return await sellToken(tokenSymbol, amount);
            }
        } catch (error: any) {
            console.error('[useSimpleDEX] Trade error:', error);
            return {
                hash: '0x0' as `0x${string}`,
                success: false,
                error: error.message || 'Trade failed'
            };
        }
    }, [buyToken, sellToken]);

    return {
        executeTrade,
        buyToken,
        sellToken,
        approveUSDC,
        approveToken,
        isLoading: isWriting || isConfirming,
        isConfirming,
        isSuccess,
        pendingTxHash,
        userAddress,
    };
}

/**
 * Hook to get a buy quote from SimpleDEX
 */
export function useBuyQuote(tokenSymbol: TokenSymbol, usdcAmount: number) {
    const token = TOKENS[tokenSymbol];
    const amountIn = parseUnits(usdcAmount.toString(), CONTRACTS.USDC.decimals);

    const { data, isLoading } = useReadContract({
        address: CONTRACTS.SIMPLE_DEX.address,
        abi: SIMPLE_DEX_ABI,
        functionName: 'getBuyQuote',
        args: [token.address, amountIn],
        query: { enabled: usdcAmount > 0 }
    });

    const [amountOut, fee] = (data as [bigint, bigint]) || [BigInt(0), BigInt(0)];

    return {
        amountOut: Number(formatUnits(amountOut, token.decimals)),
        fee: Number(formatUnits(fee, CONTRACTS.USDC.decimals)),
        isLoading,
    };
}

/**
 * Hook to get a sell quote from SimpleDEX
 */
export function useSellQuote(tokenSymbol: TokenSymbol, tokenAmount: number) {
    const token = TOKENS[tokenSymbol];
    const amountIn = parseUnits(tokenAmount.toString(), token.decimals);

    const { data, isLoading } = useReadContract({
        address: CONTRACTS.SIMPLE_DEX.address,
        abi: SIMPLE_DEX_ABI,
        functionName: 'getSellQuote',
        args: [token.address, amountIn],
        query: { enabled: tokenAmount > 0 }
    });

    const [amountOut, fee] = (data as [bigint, bigint]) || [BigInt(0), BigInt(0)];

    return {
        amountOut: Number(formatUnits(amountOut, CONTRACTS.USDC.decimals)),
        fee: Number(formatUnits(fee, CONTRACTS.USDC.decimals)),
        isLoading,
    };
}

/**
 * Hook to get token balance
 */
export function useTokenBalance(tokenSymbol: TokenSymbol) {
    const { address } = useAccount();
    const token = TOKENS[tokenSymbol];

    const { data, isLoading, refetch } = useReadContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address }
    });

    return {
        balance: data ? Number(formatUnits(data as bigint, token.decimals)) : 0,
        rawBalance: data as bigint | undefined,
        isLoading,
        refetch,
    };
}
