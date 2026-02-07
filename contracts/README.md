# ClawTrader Arena Contracts

Smart contracts for the ClawTrader Arena on Monad Testnet.

## Contract Overview

| Contract | Purpose | File |
|----------|---------|------|
| TestUSDC | Mintable USDC with faucet | `TestUSDC.sol` |
| AgentVault | User deposits for AI agents | `AgentVault.sol` |
| VaultB | Profit distribution pool | `VaultB.sol` |
| AgentFactory | On-chain agent registration | `AgentFactory.sol` |
| ClawToken | Platform utility token | `ClawToken.sol` |
| ClawArena | Match escrow and betting | `ClawArena.sol` |

## Deployment Order

Deploy in this exact sequence:

1. **TestUSDC** - No dependencies
2. **AgentVault** - Needs TestUSDC address
3. **VaultB** - Needs TestUSDC and AgentVault addresses
4. **AgentFactory** - No dependencies
5. **ClawToken** - Optional, for betting
6. **ClawArena** - Optional, needs ClawToken

## Deployment Guide (Remix IDE)

### Prerequisites
- MetaMask connected to Monad Testnet (Chain ID: 10143)
- MON tokens for gas
- Remix IDE: https://remix.ethereum.org

### Step 1: Deploy TestUSDC

```solidity
// No constructor arguments
// 10 billion USDC minted to deployer
```

1. Create `TestUSDC.sol` in Remix
2. Compile with Solidity 0.8.20
3. Deploy with no arguments
4. Save deployed address

### Step 2: Deploy AgentVault

```solidity
// Constructor: _usdc = TestUSDC address
```

1. Create `AgentVault.sol`
2. Deploy with TestUSDC address
3. Save deployed address

### Step 3: Deploy VaultB

```solidity
// Constructor: _usdc = TestUSDC, _agentVault = AgentVault address
```

1. Create `VaultB.sol`
2. Deploy with both addresses
3. Save deployed address

### Step 4: Deploy AgentFactory

```solidity
// No constructor arguments
```

### Step 5: Configure Contracts

After deployment, call these functions:

```javascript
// On AgentVault:
setVaultB(VaultB_address)
setOperator(backend_wallet_address)

// Transfer USDC to VaultB for profit pool:
// On TestUSDC:
transfer(VaultB_address, 1000000000000000) // 1B USDC
```

### Step 6: Update Frontend

Update `src/lib/contracts.ts` with deployed addresses.

## Contract Features

### TestUSDC
- ERC20 with 6 decimals
- 10 billion initial supply
- Public faucet: 1000 USDC/hour/address
- Role-based minting

### AgentVault
- Per-user per-agent balance tracking
- Operator can simulate trades
- Profits from VaultB
- 1% platform fee on profits

### VaultB
- USDC reserves for profit distribution
- Only AgentVault can request distributions
- Emergency withdraw for owner

### AgentFactory
- Permanent on-chain agent records
- Stores DNA immutably
- Links to Supabase UUIDs

## Network Config

| Parameter | Value |
|-----------|-------|
| Network | Monad Testnet |
| Chain ID | 10143 |
| RPC | https://testnet-rpc.monad.xyz |
| Explorer | https://testnet.monadexplorer.com |

## Architecture

```
User deposits USDC
    ↓
AgentVault.deposit(agentId, amount)
    ↓
Agent trades autonomously (off-chain AI)
    ↓
Backend calls AgentVault.simulateTrade()
    ↓
Profit? → VaultB.distributeProfitTo() → User balance increases
Loss? → User balance decreases
    ↓
User withdraws via AgentVault.withdraw()
```
