// Monad DEX Integration
// Using Uniswap V2 style router on Monad Testnet

import { parseUnits, formatUnits, encodeFunctionData } from 'viem';

// Monad Testnet DEX Contracts (Uniswap V2 fork)
export const MONAD_DEX_CONTRACTS = {
  ROUTER: '0x7139332aa7C461bfC6463586D0fbf5A7cdEf5324' as const,
  FACTORY: '0x759774EbC4d5C5c83a255A14A25464cAD9dc4B3F' as const,
  WMON: '0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37' as const, // Wrapped MON
  USDC: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603' as const,
};

// Router ABI (Uniswap V2 style)
export const ROUTER_ABI = [
  {
    name: 'swapExactETHForTokens',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'swapExactTokensForETH',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'swapExactTokensForTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'getAmountsOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
] as const;

// ERC20 ABI for approvals
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOutMin: bigint;
  recipient: string;
  deadline: number;
}

export function buildSwapExactETHForTokens(params: SwapParams) {
  const path: readonly `0x${string}`[] = [MONAD_DEX_CONTRACTS.WMON, params.tokenOut as `0x${string}`];
  
  return {
    to: MONAD_DEX_CONTRACTS.ROUTER,
    value: params.amountIn,
    data: encodeFunctionData({
      abi: ROUTER_ABI,
      functionName: 'swapExactETHForTokens',
      args: [params.amountOutMin, path, params.recipient as `0x${string}`, BigInt(params.deadline)],
    }),
  };
}

export function buildSwapExactTokensForETH(params: SwapParams) {
  const path: readonly `0x${string}`[] = [params.tokenIn as `0x${string}`, MONAD_DEX_CONTRACTS.WMON];
  
  return {
    to: MONAD_DEX_CONTRACTS.ROUTER,
    data: encodeFunctionData({
      abi: ROUTER_ABI,
      functionName: 'swapExactTokensForETH',
      args: [params.amountIn, params.amountOutMin, path, params.recipient as `0x${string}`, BigInt(params.deadline)],
    }),
  };
}

export function buildApproval(tokenAddress: string, amount: bigint) {
  return {
    to: tokenAddress as `0x${string}`,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [MONAD_DEX_CONTRACTS.ROUTER, amount],
    }),
  };
}

// Calculate deadline (default 20 minutes from now)
export function getDeadline(minutes: number = 20): number {
  return Math.floor(Date.now() / 1000) + minutes * 60;
}

// Format token amounts for display
export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  return formatUnits(amount, decimals);
}

// Parse token amounts from user input
export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  return parseUnits(amount, decimals);
}
