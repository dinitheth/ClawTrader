# ClawTrader

ClawTrader is a decentralized autonomous trading platform built on Monad blockchain. AI-powered trading agents compete, evolve, and generate returns using real market data and intelligent decision-making algorithms.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [System Architecture](#system-architecture)
4. [Technology Stack](#technology-stack)
5. [How It Works](#how-it-works)
6. [Smart Contracts](#smart-contracts)
7. [Deployment Guide](#deployment-guide)
8. [Environment Configuration](#environment-configuration)
9. [Competition Alignment](#competition-alignment)
10. [License](#license)

---

## Overview

ClawTrader enables users to create autonomous AI trading agents that analyze cryptocurrency markets and execute trades independently. Each agent has unique DNA traits (aggression, risk tolerance, pattern recognition) that influence trading decisions. The platform uses USDC as the primary trading currency and provides real-time market analysis powered by Google Gemini AI.

The platform operates on Monad Testnet, leveraging its high throughput and low latency for real-time trade execution and settlement.

---

## Features

- Autonomous Trading Agents: Create AI agents with customizable DNA parameters that influence trading behavior
- Real-Time Market Analysis: Agents analyze live market data from CoinGecko and crypto news feeds
- AI-Powered Decisions: Google Gemini processes market conditions through agent DNA to generate BUY/SELL/HOLD decisions
- USDC Economy: Testnet USDC faucet provides 1000 USDC per hour for agent funding
- Agent Vault System: Agents maintain USDC balances for trading and profit distribution
- Performance Tracking: Real-time P&L, win rate, and trade history for each agent
- Spectator Betting: Users can bet on agent match outcomes with on-chain settlement
- Token Launch Integration: Agents can launch ERC-20 tokens on nad.fun bonding curve

---

## System Architecture

```
+-------------------+     +-------------------+     +-------------------+
|                   |     |                   |     |                   |
|   React Client    |---->|   Lovable Cloud   |---->|   Monad Chain     |
|   (Frontend)      |     |   (Backend)       |     |   (Settlement)    |
|                   |     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
        |                         |                         |
        v                         v                         v
+-------------------+     +-------------------+     +-------------------+
|  Wagmi + Viem     |     |  Edge Functions   |     |  AgentWallet.sol  |
|  Wallet Connect   |     |  - AI Analysis    |     |  ClawToken.sol    |
|  (RainbowKit)     |     |  - Trade Execute  |     |  ClawArena.sol    |
+-------------------+     +-------------------+     +-------------------+
        |                         |
        v                         v
+-------------------+     +-------------------+
|  TradingView      |     |  Google Gemini    |
|  Market Charts    |     |  AI Gateway       |
+-------------------+     +-------------------+
```

### Data Flow

1. User creates agent with DNA parameters stored in database
2. User funds agent with USDC (virtual balance or on-chain via AgentWallet)
3. Agent triggers analysis on 30-second intervals during autonomous trading
4. Edge function fetches market data from CoinGecko API
5. Gemini AI processes data through agent DNA to generate trading decision
6. Trade is executed and P&L calculated
7. Agent balance and statistics updated in real-time

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 + TypeScript | Type-safe UI framework |
| Styling | TailwindCSS + shadcn/ui | Apple-inspired design system |
| Wallet | Wagmi + RainbowKit | Web3 wallet connection |
| Blockchain | Viem | Ethereum client |
| Backend | Lovable Cloud (Supabase) | Database and serverless functions |
| AI | Google Gemini | Agent decision making |
| Market Data | CoinGecko API | Real-time cryptocurrency prices |
| News | NewsData.io API | Crypto news headlines |
| Charts | TradingView Widget | Professional trading charts |
| Chain | Monad Testnet | Transaction settlement |
| Smart Contracts | Solidity | On-chain trade execution |
| Build | Vite | Development and bundling |

---

## How It Works

### Step 1: Create an Agent

Users connect their wallet and create a trading agent with customized DNA traits:

- Aggression (0-100): How quickly the agent enters/exits positions
- Risk Tolerance (0-100): Maximum position size relative to portfolio
- Pattern Recognition (0-100): Ability to detect market patterns
- Contrarian Bias (0-100): Tendency to trade against market sentiment
- Timing Sensitivity (0-100): Reaction speed to market changes

### Step 2: Fund the Agent

Users claim testnet USDC from the faucet (1000 USDC per hour) and deposit into their agent's trading balance. This balance is tracked in the database and can be upgraded to on-chain via the AgentWallet smart contract.

### Step 3: Autonomous Trading

When the user enables "Auto Trade":

1. Every 30 seconds, the system fetches live market data
2. Gemini AI analyzes the data through the agent's DNA parameters
3. AI returns a decision (BUY/SELL/HOLD) with confidence score
4. If confidence exceeds threshold, trade is executed
5. P&L is calculated and agent balance updated

### Step 4: AI Decision Making

Each cycle, the AI evaluates:
- Current market state (price, volume, 24h change)
- Technical indicators (RSI, MACD, moving averages)
- Agent DNA traits and personality type
- Portfolio balance and risk parameters

Response includes:
- Action: BUY, SELL, or HOLD
- Confidence: 0-100% certainty
- Reasoning: Technical analysis explanation
- Risk Assessment: Trade risk evaluation
- Suggested Amount: Percentage of portfolio to trade

### Step 5: Profit Distribution

Agents track cumulative P&L. Users can withdraw profits via the Withdraw modal. For on-chain execution, the AgentWallet contract handles fund custody and automated payouts.

---

## Smart Contracts

### Contracts to Deploy

You must deploy these contracts to Monad Testnet for full on-chain functionality:

| Contract | Purpose | Required |
|----------|---------|----------|
| AgentWallet.sol | Holds USDC for agents, executes trades, distributes profits | Yes |
| ClawToken.sol | Platform ERC-20 token for betting | Optional |
| ClawArena.sol | Match escrow and bet settlement | Optional |

### AgentWallet.sol

Primary contract for autonomous trading. Holds funds and allows authorized operator (backend) to execute trades.

Key Functions:
- `fundAgent(bytes32 agentId)`: Deposit funds to an agent
- `withdrawFromAgent(bytes32 agentId, uint256 amount)`: Owner withdraws funds
- `executeBuy(...)`: Operator executes buy trade for agent
- `executeSell(...)`: Operator executes sell trade for agent
- `getAgentBalance(bytes32 agentId)`: View agent balance

### ClawToken.sol

ERC-20 token with built-in faucet for testnet.

Key Functions:
- `faucet()`: Claim 1000 CLAW tokens (1 hour cooldown)
- Standard ERC-20 functions (transfer, approve, etc.)

### ClawArena.sol

Match and betting management.

Key Functions:
- `createMatch(agent1, agent2, wager)`: Initialize match
- `placeBet(matchId, winner, amount)`: Place bet on outcome
- `settleMatch(matchId, winner)`: Oracle settlement
- `claimWinnings(matchId)`: Withdraw winnings

---

## Deployment Guide

### Prerequisites

- Node.js 18 or higher
- MetaMask or compatible Web3 wallet
- Monad Testnet MON for gas fees

### Step 1: Configure Wallet

Add Monad Testnet to your wallet:

| Setting | Value |
|---------|-------|
| Network Name | Monad Testnet |
| RPC URL | https://testnet-rpc.monad.xyz |
| Chain ID | 10143 |
| Currency Symbol | MON |
| Block Explorer | https://testnet.monadexplorer.com |

### Step 2: Get Testnet MON

Use the Monad faucet to get testnet MON for gas fees.

### Step 3: Deploy Contracts via Remix IDE

1. Open Remix IDE (https://remix.ethereum.org)
2. Create new files and paste contract code:
   - `AgentWallet.sol`
   - `ClawToken.sol` (optional)
   - `ClawArena.sol` (optional)
3. Install OpenZeppelin contracts:
   - In Remix, click on the file icon
   - Import @openzeppelin/contracts as needed
4. Compile each contract (Solidity 0.8.20)
5. Connect MetaMask to Monad Testnet
6. Deploy each contract
7. Save deployed contract addresses

### Step 4: Update Configuration

After deploying, update `src/lib/usdc-config.ts`:

```typescript
export const USDC_CONFIG = {
  contractAddress: '0xYOUR_DEPLOYED_USDC_ADDRESS' as `0x${string}`,
  decimals: 6,
  symbol: 'USDC',
};
```

For AgentWallet, create `src/lib/agent-wallet-config.ts`:

```typescript
export const AGENT_WALLET_CONFIG = {
  contractAddress: '0xYOUR_DEPLOYED_AGENT_WALLET' as `0x${string}`,
};
```

### Step 5: Set Operator

Call `setOperator(backendWalletAddress)` on AgentWallet to authorize the backend wallet for trade execution.

---

## Environment Configuration

Environment variables are managed automatically by Lovable Cloud:

| Variable | Description |
|----------|-------------|
| VITE_SUPABASE_URL | Backend API URL |
| VITE_SUPABASE_PUBLISHABLE_KEY | Backend public key |

For local development, these are provided in the `.env` file.

---

## Competition Alignment

ClawTrader is built for the Moltiverse Building Event (February 2-18, 2026) in the Agent+Token Track.

### Core Thesis

Autonomous agents need money rails and the ability to transact at scale. Monad provides high-performance blockchain infrastructure, and nad.fun enables community building and monetization around agents.

### Requirements Met

| Requirement | Implementation |
|-------------|----------------|
| Agent does cool stuff | AI agents analyze markets and trade autonomously using Gemini AI |
| Token launched on nad.fun | Full integration with nad.fun bonding curve and token launch flow |
| Community can speculate | Public token trading with real-time market cap tracking |
| Creative token utility | Revenue share, governance voting, access control, evolution rights |

### Technical Implementation

- Agent Logic: Lovable Cloud Edge Functions with Google Gemini AI
- Token Launch: nad.fun SDK with vanity address mining
- On-Chain Settlement: Solidity smart contracts for trade execution
- Real-Time Updates: Database realtime subscriptions for live updates

---

## Project Structure

```
clawtrader/
├── contracts/                    # Solidity smart contracts
│   ├── AgentWallet.sol           # Agent fund custody and trading
│   ├── ClawToken.sol             # Platform ERC-20 token
│   ├── ClawArena.sol             # Match and betting contract
│   └── scripts/                  # Deployment scripts
├── src/
│   ├── components/               # React UI components
│   │   ├── arena/                # Match display components
│   │   ├── agents/               # Agent management
│   │   ├── faucet/               # Token faucet UI
│   │   ├── trading/              # Trading dashboard
│   │   ├── layout/               # Page layout
│   │   ├── providers/            # Context providers
│   │   └── ui/                   # shadcn components
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utilities and API clients
│   ├── pages/                    # Route pages
│   └── integrations/             # Backend client
├── supabase/
│   └── functions/                # Edge functions
│       ├── ai-trading-analysis/  # Gemini AI trading decisions
│       ├── execute-agent-trade/  # Autonomous trade execution
│       └── claim-usdc-faucet/    # USDC faucet claims
└── public/                       # Static assets
```

---

## License

This project is open source under the MIT License.

---

## Links

- Monad: https://monad.xyz
- Testnet Explorer: https://testnet.monadexplorer.com
- nad.fun: https://nad.fun
- Moltiverse: https://moltiverse.dev
