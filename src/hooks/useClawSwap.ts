/**
 * useClawSwap Hook
 * Handles on-chain USDC → CLAW token swaps via the ClawSwap contract
 * Rate: 1 USDC = 100 CLAW
 */

import { useState, useCallback } from 'react';
import { useWriteContract, useReadContract, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACTS, USDC_ABI } from '../lib/contracts';
import { monadTestnet } from '../lib/wagmi';

// ClawSwap contract address — UPDATE after deployment
export const CLAW_SWAP_ADDRESS = '0xd9362A0d7420ff8cDb6Cb93a23B224B4e95671c5' as `0x${string}`;

const CLAW_TOKEN_ADDRESS = CONTRACTS.CLAW_TOKEN.address;
const USDC_ADDRESS = CONTRACTS.USDC.address;
const SWAP_RATE = 100; // 1 USDC = 100 CLAW

// Minimal ABIs
const CLAW_SWAP_ABI = [
    { name: 'swap', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'usdcAmount', type: 'uint256' }], outputs: [] },
    { name: 'preview', type: 'function', stateMutability: 'view', inputs: [{ name: 'usdcAmount', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
    { name: 'clawBalance', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
    { name: 'totalSwapped', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

const ERC20_BALANCE_ABI = [
    { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
    { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
    { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
    { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
] as const;

export interface SwapState {
    step: 'idle' | 'approving' | 'swapping' | 'success' | 'error';
    txHash?: string;
    error?: string;
}

export function useClawSwap() {
    const { address } = useAccount();
    const { writeContractAsync } = useWriteContract();
    const [swapState, setSwapState] = useState<SwapState>({ step: 'idle' });
    const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>();

    // Read USDC balance
    const { data: usdcBalanceRaw, refetch: refetchUsdcBalance } = useReadContract({
        address: USDC_ADDRESS,
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    // Read CLAW balance
    const { data: clawBalanceRaw, refetch: refetchClawBalance } = useReadContract({
        address: CLAW_TOKEN_ADDRESS,
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    // Read USDC allowance for ClawSwap
    const { data: usdcAllowanceRaw, refetch: refetchAllowance } = useReadContract({
        address: USDC_ADDRESS,
        abi: ERC20_BALANCE_ABI,
        functionName: 'allowance',
        args: address ? [address, CLAW_SWAP_ADDRESS] : undefined,
        query: { enabled: !!address && CLAW_SWAP_ADDRESS !== '0x0000000000000000000000000000000000000000' },
    });

    // Read pool CLAW liquidity
    const { data: poolClawBalanceRaw } = useReadContract({
        address: CLAW_SWAP_ADDRESS,
        abi: CLAW_SWAP_ABI,
        functionName: 'clawBalance',
        query: { enabled: CLAW_SWAP_ADDRESS !== '0x0000000000000000000000000000000000000000' },
    });

    // Wait for tx confirmation
    const { isLoading: isConfirming } = useWaitForTransactionReceipt({
        hash: lastTxHash,
    });

    // Formatted balances
    const usdcBalance = usdcBalanceRaw ? Number(formatUnits(usdcBalanceRaw as bigint, 6)) : 0;
    const clawBalance = clawBalanceRaw ? Number(formatUnits(clawBalanceRaw as bigint, 18)) : 0;
    const usdcAllowance = usdcAllowanceRaw ? Number(formatUnits(usdcAllowanceRaw as bigint, 6)) : 0;
    const poolLiquidity = poolClawBalanceRaw ? Number(formatUnits(poolClawBalanceRaw as bigint, 18)) : 0;

    const isContractDeployed = CLAW_SWAP_ADDRESS !== '0x0000000000000000000000000000000000000000';

    // Preview swap output
    const previewSwap = useCallback((usdcAmount: number) => {
        return usdcAmount * SWAP_RATE;
    }, []);

    // Execute swap: approve USDC → call swap()
    const executeSwap = useCallback(async (usdcAmount: number) => {
        if (!address) throw new Error('Wallet not connected');
        if (!isContractDeployed) throw new Error('Swap contract not deployed yet');

        const usdcWei = parseUnits(usdcAmount.toString(), 6);
        setSwapState({ step: 'idle' });

        try {
            // Step 1: Check and approve USDC if needed
            if (usdcAllowance < usdcAmount) {
                setSwapState({ step: 'approving' });
                const approveTx = await writeContractAsync({
                    address: USDC_ADDRESS,
                    abi: ERC20_BALANCE_ABI,
                    functionName: 'approve',
                    args: [CLAW_SWAP_ADDRESS, usdcWei],
                    chain: monadTestnet,
                    account: address,
                });
                setLastTxHash(approveTx);
                // Small delay for approval to propagate
                await new Promise(r => setTimeout(r, 3000));
            }

            // Step 2: Execute swap
            setSwapState({ step: 'swapping' });
            const swapTx = await writeContractAsync({
                address: CLAW_SWAP_ADDRESS,
                abi: CLAW_SWAP_ABI,
                functionName: 'swap',
                args: [usdcWei],
                chain: monadTestnet,
                account: address,
            });
            setLastTxHash(swapTx);
            setSwapState({ step: 'success', txHash: swapTx });

            // Refresh balances
            setTimeout(() => {
                refetchUsdcBalance();
                refetchClawBalance();
                refetchAllowance();
            }, 5000);

            return swapTx;
        } catch (err: any) {
            const errorMsg = err.shortMessage || err.message || 'Swap failed';
            setSwapState({ step: 'error', error: errorMsg });
            throw err;
        }
    }, [address, isContractDeployed, usdcAllowance, writeContractAsync, refetchUsdcBalance, refetchClawBalance, refetchAllowance]);

    const reset = useCallback(() => {
        setSwapState({ step: 'idle' });
        setLastTxHash(undefined);
    }, []);

    return {
        // Balances
        usdcBalance,
        clawBalance,
        poolLiquidity,
        usdcAllowance,

        // State
        swapState,
        isConfirming,
        isContractDeployed,
        SWAP_RATE,

        // Actions
        previewSwap,
        executeSwap,
        reset,
        refetchBalances: () => {
            refetchUsdcBalance();
            refetchClawBalance();
        },
    };
}
