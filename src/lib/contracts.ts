// Contract addresses for Monad Testnet deployment
// Deployed on 2026-02-08 & 2026-02-09

export const CONTRACTS = {
  // TestUSDC - Mintable ERC20 with faucet
  USDC: {
    address: '0xE5C0a7AB54002FeDfF0Ca7082d242F9D04265f3b' as `0x${string}`,
    decimals: 6,
    symbol: 'USDC',
    name: 'Test USDC',
  },

  // AgentVaultV2 - Holds user deposits and executes real trades via SimpleDEX
  AGENT_VAULT: {
    address: '0x50646200817C52BFa61a5398b3C6dcf217b606Cf' as `0x${string}`,
  },

  // VaultB - Holds USDC for profit distribution
  VAULT_B: {
    address: '0x43236A83599Ce79557ad218ca1aF6109B2400d31' as `0x${string}`,
  },

  // AgentFactory - On-chain agent registration
  AGENT_FACTORY: {
    address: '0x11bCcC1FE610B42A2649467C38eBA52Aa32F8a05' as `0x${string}`,
  },

  // ClawToken - Platform token for arena betting
  CLAW_TOKEN: {
    address: '0x849DC7064089e9f47c3d102E224302C72b5aC134' as `0x${string}`,
    decimals: 18,
    symbol: 'CLAW',
    name: 'ClawToken',
  },

  // TestBTC - Test Bitcoin token (21M supply, 8 decimals)
  TEST_BTC: {
    address: '0x8C56E4d502C544556b76bbC4b8f7E7Fc58511c87' as `0x${string}`,
    decimals: 8,
    symbol: 'tBTC',
    name: 'Test Bitcoin',
  },

  // TestETH - Test Ethereum token (120M supply, 18 decimals)
  TEST_ETH: {
    address: '0x3809C6E3512c409Ded482240Bd1005c1c40fE5e4' as `0x${string}`,
    decimals: 18,
    symbol: 'tETH',
    name: 'Test Ethereum',
  },

  // TestSOL - Test Solana token (500M supply, 9 decimals)
  TEST_SOL: {
    address: '0xD02dB25175f69A1b1A03d6F6a8d4A566a99061Af' as `0x${string}`,
    decimals: 9,
    symbol: 'tSOL',
    name: 'Test Solana',
  },

  // SimpleDEX - DEX for trading tokens at oracle prices
  SIMPLE_DEX: {
    address: '0x7f09C84a42A5f881d8cebC3c319DC108c20eE762' as `0x${string}`,
  },

  // BettingEscrow - Parimutuel betting escrow for esports
  BETTING_ESCROW: {
    address: '0x41d521347068B09bfFE2E2bba9946FC9368c6A17' as `0x${string}`,
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
  // Deposit USDC for an agent
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: []
  },
  // Withdraw USDC from an agent
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: []
  },
  // Get user's balance for a specific agent
  {
    name: 'getUserAgentBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'agentId', type: 'bytes32' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  // Get list of agents a user has deposited to
  {
    name: 'getUserAgents',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }]
  },
  // Get total balance across all users for an agent
  {
    name: 'getAgentTotalBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  // Get USDC token address
  {
    name: 'usdc',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
] as const;

export const VAULT_B_ABI = [
  { name: 'getBalance', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'fund', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
] as const;

export const AGENT_FACTORY_ABI = [
  { name: 'createAgent', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'bytes32' }, { name: 'name', type: 'string' }, { name: 'avatar', type: 'string' }, { name: 'personality', type: 'uint8' }, { name: 'dnaRisk', type: 'uint256' }, { name: 'dnaAggression', type: 'uint256' }, { name: 'dnaPattern', type: 'uint256' }, { name: 'dnaTiming', type: 'uint256' }, { name: 'dnaContrarian', type: 'uint256' }], outputs: [{ name: '', type: 'bytes32' }] },
  { name: 'evolveAgent', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'bytes32' }, { name: 'newDnaRisk', type: 'uint256' }, { name: 'newDnaAggression', type: 'uint256' }, { name: 'newDnaPattern', type: 'uint256' }, { name: 'newDnaTiming', type: 'uint256' }, { name: 'newDnaContrarian', type: 'uint256' }], outputs: [] },
  { name: 'setAgentToken', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'id', type: 'bytes32' }, { name: 'tokenAddress', type: 'address' }], outputs: [] },
  { name: 'getAgent', type: 'function', stateMutability: 'view', inputs: [{ name: 'id', type: 'bytes32' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'id', type: 'bytes32' }, { name: 'owner', type: 'address' }, { name: 'name', type: 'string' }, { name: 'avatar', type: 'string' }, { name: 'personality', type: 'uint8' }, { name: 'dnaRisk', type: 'uint256' }, { name: 'dnaAggression', type: 'uint256' }, { name: 'dnaPattern', type: 'uint256' }, { name: 'dnaTiming', type: 'uint256' }, { name: 'dnaContrarian', type: 'uint256' }, { name: 'generation', type: 'uint256' }, { name: 'createdAt', type: 'uint256' }, { name: 'tokenAddress', type: 'address' }, { name: 'isActive', type: 'bool' }] }] },
  { name: 'getOwnerAgents', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'bytes32[]' }] },
  { name: 'uuidToBytes32', type: 'function', stateMutability: 'pure', inputs: [{ name: 'uuid', type: 'string' }], outputs: [{ name: '', type: 'bytes32' }] },
  { name: 'totalAgents', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

// nad.fun BondingCurveRouter ABI (Monad Testnet)
export const BONDING_CURVE_ROUTER_ABI = [
  {
    name: 'create',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{
      name: 'params',
      type: 'tuple',
      components: [
        { name: 'name', type: 'string' },
        { name: 'symbol', type: 'string' },
        { name: 'tokenURI', type: 'string' },
        { name: 'amountOut', type: 'uint256' },
        { name: 'salt', type: 'bytes32' },
        { name: 'actionId', type: 'uint256' },
      ],
    }],
    outputs: [
      { name: 'token', type: 'address' },
      { name: 'pool', type: 'address' },
    ],
  },
] as const;

// nad.fun CurveCreate event ABI (for parsing tx receipts)
export const CURVE_CREATE_EVENT_ABI = [
  {
    name: 'CurveCreate',
    type: 'event',
    inputs: [
      { name: 'creator', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: true },
      { name: 'pool', type: 'address', indexed: false },
      { name: 'name', type: 'string', indexed: false },
      { name: 'symbol', type: 'string', indexed: false },
      { name: 'tokenURI', type: 'string', indexed: false },
      { name: 'virtualMonReserve', type: 'uint256', indexed: false },
      { name: 'virtualTokenReserve', type: 'uint256', indexed: false },
      { name: 'targetTokenAmount', type: 'uint256', indexed: false },
    ],
  },
] as const;

export const SIMPLE_DEX_ABI = [
  // Trading functions
  { name: 'buyToken', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'tokenOut', type: 'address' }, { name: 'amountIn', type: 'uint256' }, { name: 'minAmountOut', type: 'uint256' }], outputs: [{ name: 'amountOut', type: 'uint256' }] },
  { name: 'sellToken', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'tokenIn', type: 'address' }, { name: 'amountIn', type: 'uint256' }, { name: 'minAmountOut', type: 'uint256' }], outputs: [{ name: 'amountOut', type: 'uint256' }] },
  // View functions
  { name: 'getBuyQuote', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenOut', type: 'address' }, { name: 'amountIn', type: 'uint256' }], outputs: [{ name: 'amountOut', type: 'uint256' }, { name: 'fee', type: 'uint256' }] },
  { name: 'getSellQuote', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenIn', type: 'address' }, { name: 'amountIn', type: 'uint256' }], outputs: [{ name: 'amountOut', type: 'uint256' }, { name: 'fee', type: 'uint256' }] },
  { name: 'getPrice', type: 'function', stateMutability: 'view', inputs: [{ name: 'token', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getPoolBalance', type: 'function', stateMutability: 'view', inputs: [{ name: 'token', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'isTokenSupported', type: 'function', stateMutability: 'view', inputs: [{ name: 'token', type: 'address' }], outputs: [{ name: '', type: 'bool' }] },
  // Admin functions (for price updates)
  { name: 'updatePrice', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'token', type: 'address' }, { name: 'newPrice', type: 'uint256' }], outputs: [] },
  { name: 'updatePrices', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'tokens', type: 'address[]' }, { name: 'prices', type: 'uint256[]' }], outputs: [] },
  { name: 'addToken', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'token', type: 'address' }, { name: 'decimals', type: 'uint8' }, { name: 'initialPrice', type: 'uint256' }], outputs: [] },
  { name: 'addLiquidity', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
] as const;

// ERC20 ABI for trading tokens
export const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
] as const;


/**
 * Convert UUID string to bytes32 for contract calls
 * Uses keccak256 hash of the UUID for deterministic conversion
 */
export function uuidToBytes32(uuid: string): `0x${string}` {
  // Remove dashes and convert to hex, then pad to 64 chars
  const cleanUuid = uuid.replace(/-/g, '');
  return `0x${cleanUuid.padEnd(64, '0')}` as `0x${string}`;
}

/**
 * Check if contracts are configured (not placeholder addresses)
 */
export function isContractConfigured(contractKey: keyof typeof CONTRACTS): boolean {
  const contract = CONTRACTS[contractKey];
  const address = 'address' in contract ? contract.address : null;
  return address !== null && address !== '0x0000000000000000000000000000000000000000';
}

// Helper to format USDC (6 decimals)
export function formatUSDC(amount: bigint | number): string {
  const value = typeof amount === 'bigint'
    ? Number(amount) / 10 ** CONTRACTS.USDC.decimals
    : amount;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Helper to parse USDC to wei (6 decimals)
export function parseUSDC(amount: number): bigint {
  return BigInt(Math.floor(amount * 10 ** CONTRACTS.USDC.decimals));
}

