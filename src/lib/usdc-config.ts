// USDC Token Configuration for Monad Testnet
// This will be updated with the actual contract address once deployed

export const USDC_CONFIG = {
  // Placeholder - will be replaced with actual deployed contract address
  contractAddress: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  symbol: 'USDC',
  name: 'USD Coin (Testnet)',
  decimals: 6,
  faucetAmount: 1000, // Amount to claim from faucet
  faucetCooldown: 60 * 60 * 1000, // 1 hour cooldown in ms
};

// ERC20 ABI for reading balance and transfers
export const ERC20_ABI = [
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
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

// Helper to format USDC amounts (6 decimals)
export function formatUSDC(amount: bigint | number): string {
  const value = typeof amount === 'bigint' 
    ? Number(amount) / 10 ** USDC_CONFIG.decimals 
    : amount;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Helper to parse USDC amounts to smallest unit
export function parseUSDC(amount: number): bigint {
  return BigInt(Math.floor(amount * 10 ** USDC_CONFIG.decimals));
}

// Update the contract address (call this when you have the deployed address)
export function setUSDCContractAddress(address: `0x${string}`) {
  USDC_CONFIG.contractAddress = address;
}
