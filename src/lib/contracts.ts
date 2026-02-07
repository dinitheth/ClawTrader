// Contract addresses for Monad Testnet deployment
// Update these after deploying contracts via Remix IDE

export const CONTRACTS = {
  // TestUSDC - Mintable ERC20 with faucet
  USDC: {
    address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    decimals: 6,
    symbol: 'USDC',
    name: 'Test USDC',
  },
  
  // AgentVault - Holds user deposits for agents
  AGENT_VAULT: {
    address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
  
  // VaultB - Holds USDC for profit distribution
  VAULT_B: {
    address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
  
  // AgentFactory - On-chain agent registration
  AGENT_FACTORY: {
    address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
} as const;

// ABIs
export const USDC_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'faucet', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'canClaim', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'timeUntilClaim', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
] as const;

export const AGENT_VAULT_ABI = [
  { name: 'deposit', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'agentId', type: 'bytes32' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'withdraw', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'agentId', type: 'bytes32' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'getUserAgentBalance', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }, { name: 'agentId', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getUserAgents', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'bytes32[]' }] },
  { name: 'getAgentTotalBalance', type: 'function', stateMutability: 'view', inputs: [{ name: 'agentId', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }] },
] as const;

export const VAULT_B_ABI = [
  { name: 'getBalance', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'fund', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
] as const;

export const AGENT_FACTORY_ABI = [
  { name: 'createAgent', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'bytes32' }, { name: 'name', type: 'string' }, { name: 'avatar', type: 'string' }, { name: 'personality', type: 'uint8' }, { name: 'dnaRisk', type: 'uint256' }, { name: 'dnaAggression', type: 'uint256' }, { name: 'dnaPattern', type: 'uint256' }, { name: 'dnaTiming', type: 'uint256' }, { name: 'dnaContrarian', type: 'uint256' }], outputs: [{ name: '', type: 'bytes32' }] },
  { name: 'getAgent', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'bytes32' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'id', type: 'bytes32' }, { name: 'owner', type: 'address' }, { name: 'name', type: 'string' }, { name: 'avatar', type: 'string' }, { name: 'personality', type: 'uint8' }, { name: 'dnaRisk', type: 'uint256' }, { name: 'dnaAggression', type: 'uint256' }, { name: 'dnaPattern', type: 'uint256' }, { name: 'dnaTiming', type: 'uint256' }, { name: 'dnaContrarian', type: 'uint256' }, { name: 'generation', type: 'uint256' }, { name: 'createdAt', type: 'uint256' }, { name: 'tokenAddress', type: 'address' }, { name: 'isActive', type: 'bool' }] }] },
  { name: 'uuidToBytes32', type: 'function', stateMutability: 'pure', inputs: [{ name: 'uuid', type: 'string' }], outputs: [{ name: '', type: 'bytes32' }] },
  { name: 'totalAgents', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

// Helper to convert UUID to bytes32
export function uuidToBytes32(uuid: string): `0x${string}` {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(uuid);
  const hash = Array.from(bytes).reduce((acc, byte) => {
    return acc + byte.toString(16).padStart(2, '0');
  }, '');
  return `0x${hash.padEnd(64, '0').slice(0, 64)}` as `0x${string}`;
}

// Helper to format USDC
export function formatUSDC(amount: bigint | number): string {
  const value = typeof amount === 'bigint' 
    ? Number(amount) / 10 ** CONTRACTS.USDC.decimals 
    : amount;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Helper to parse USDC to wei
export function parseUSDC(amount: number): bigint {
  return BigInt(Math.floor(amount * 10 ** CONTRACTS.USDC.decimals));
}
