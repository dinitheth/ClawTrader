import { http, createConfig } from 'wagmi';
import { injected } from 'wagmi/connectors';

// Monad Testnet Chain Definition (Chain ID: 10143)
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

// Monad Mainnet (for future use)
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

// Nad.fun contract addresses — TESTNET (from https://nad.fun/skill.md)
export const NAD_CONTRACTS = {
  BONDING_CURVE_ROUTER: '0x865054F0F6A288adaAc30261731361EA7E908003',
  CURVE: '0x1228b0dc9481C11D3071E7A924B794CfB038994e',
  LENS: '0xB056d79CA5257589692699a46623F901a3BB76f1',
  DEX_ROUTER: '0x5D4a4f430cA3B1b2dB86B9cFE48a5316800F5fb2',
  DEX_FACTORY: '0xd0a37cf728CE2902eB8d4F6f2afc76854048253b',
  WMON: '0x5a4E0bFDeF88C9032CB4d24338C5EB3d3870BfDd',
  CREATOR_TREASURY: '0x24dFf9B68fA36f8400302e2babC3e049eA19459E',
} as const;

// Wagmi configuration - only injected wallets (MetaMask, Rabby, etc.)
export const config = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [monadTestnet.id]: http('https://testnet-rpc.monad.xyz'),
  },
});

// Agent Faucet endpoint (for testnet MON)
export const AGENT_FAUCET_URL = 'https://agents.devnads.com/v1/faucet';
export const VERIFY_AGENT_URL = 'https://agents.devnads.com/v1/verify';

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
  {
    name: 'faucet',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const;

// Arena Escrow Contract (placeholder - update after deployment)
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
