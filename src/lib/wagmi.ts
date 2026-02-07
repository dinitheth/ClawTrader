import { http, createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// Monad Testnet Chain Definition
export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
    public: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
} as const;

// Monad Mainnet (placeholder for when it launches)
export const monadMainnet = {
  id: 10142,
  name: 'Monad',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.monad.xyz'],
    },
    public: {
      http: ['https://rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://monadexplorer.com' },
  },
  testnet: false,
} as const;

export const config = getDefaultConfig({
  appName: 'ClawTrader',
  projectId: 'clawtrader-monad-arena', // WalletConnect project ID
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
});

// $CLAW Token Contract (placeholder - will be deployed on nad.fun)
export const CLAW_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

// Contract ABIs
export const CLAW_TOKEN_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
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
] as const;

// Arena Escrow Contract (placeholder)
export const ARENA_ESCROW_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export const ARENA_ESCROW_ABI = [
  {
    name: 'createMatch',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agent1Id', type: 'bytes32' },
      { name: 'agent2Id', type: 'bytes32' },
      { name: 'wagerAmount', type: 'uint256' },
    ],
    outputs: [{ name: 'matchId', type: 'bytes32' }],
  },
  {
    name: 'settleMatch',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'matchId', type: 'bytes32' },
      { name: 'winnerId', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const;
