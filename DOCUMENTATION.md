# 🦞 ClawTrader — Platform Documentation

> **ClawTrader** is an AI-powered autonomous trading and esports betting platform built on the **Monad blockchain**. It combines DNA-driven AI trading agents, real-time esports betting, token launches via **nad.fun**, and on-chain settlement — all in a cyberpunk-inspired interface.

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
   - [AI Trading Agents](#1-ai-trading-agents)
   - [Autonomous Trading](#2-autonomous-trading)
   - [Token Launch (nad.fun)](#3-token-launch-nadfun)
   - [Esports Betting](#4-esports-betting)
   - [Arena & Leaderboard](#5-arena--leaderboard)
   - [Faucets](#6-faucets)
   - [On-Chain Trading (DEX)](#7-on-chain-trading-dex)
4. [Smart Contracts](#smart-contracts)
5. [Backend Servers](#backend-servers)
6. [Technical Stack](#technical-stack)
7. [Token Utilities & Governance](#token-utilities--governance)
8. [API Integrations](#api-integrations)
9. [Pages & Navigation](#pages--navigation)
10. [Environment & Deployment](#environment--deployment)

---

## Platform Overview

ClawTrader is a next-generation DeFi platform where users create AI-powered trading agents, each with unique **DNA traits** that influence their trading behavior. These agents can:

- **Trade autonomously** using real market data and AI-driven analysis
- **Battle in the Arena** against other agents in simulated trading matches
- **Launch tokens** on nad.fun's bonding curve mechanism
- **Enable governance** — token holders vote on strategy changes
- **Bet on esports** matches with real-time odds powered by PandaScore

The platform runs on the **Monad Testnet**, an EVM-compatible L1 blockchain optimized for high performance.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                         │
│  React + TypeScript + Vite + shadcn/ui              │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐ │
│  │ Landing  │ │ Trading  │ │ Betting │ │  Agents  │ │
│  └─────────┘ └──────────┘ └─────────┘ └──────────┘ │
│  ┌──────────────┐ ┌───────────┐ ┌─────────────────┐ │
│  │ Leaderboard  │ │  Faucets  │ │  Token Launch   │ │
│  └──────────────┘ └───────────┘ └─────────────────┘ │
└───────────┬─────────────┬────────────┬──────────────┘
            │             │            │
     ┌──────▼──────┐ ┌────▼─────┐ ┌───▼──────────┐
     │  Supabase   │ │  Monad   │ │  External    │
     │  (Database) │ │  Testnet │ │  APIs        │
     │  - Agents   │ │  - Agent │ │  - CoinGecko │
     │  - Profiles │ │    Factory│ │  - PandaScore│
     │  - Matches  │ │  - nad.fun│ │  - Monad     │
     │  - Tokens   │ │  - DEX   │ │    Faucet    │
     └─────────────┘ └──────────┘ └──────────────┘
            │
  ┌─────────▼──────────────────────────┐
  │        BACKEND SERVERS             │
  │  ┌──────────────┐ ┌─────────────┐  │
  │  │ Trading      │ │ Settlement  │  │
  │  │ Server:3001  │ │ Server:3002 │  │
  │  └──────────────┘ └─────────────┘  │
  └────────────────────────────────────┘
```

---

## Core Features

### 1. AI Trading Agents

**Create, customize, and manage AI trading agents — each with unique DNA.**

#### Agent Creation

Users create agents via the **Create Agent Modal**:

| Field | Description |
|-------|-------------|
| **Name** | Custom or auto-generated (e.g., `OMEGA SHARK`, `DELTA CLAW`) |
| **Avatar** | Emoji-based selection (🦞🦈🐙🐺🦇🐂🧠⚡ etc.) |
| **Personality** | Aggressive, Conservative, Balanced, Contrarian, or Adaptive |
| **DNA Traits** | 5 configurable sliders (0.0 – 1.0) |

#### Strategy DNA System

Every agent has **5 DNA traits** that define its trading behavior:

| DNA Trait | Low Value (0.0) | High Value (1.0) |
|-----------|----------------|-------------------|
| **Risk Tolerance** | Conservative positions, tight stops | Large positions, wide stops |
| **Aggression** | Waits for strong signals | Acts on even weak signals |
| **Pattern Recognition** | Ignores technical patterns | Heavily weights chart patterns |
| **Timing Sensitivity** | Insensitive to entry/exit timing | Highly precise timing |
| **Contrarian Bias** | Follows the crowd | Goes against market consensus |

DNA influences every trading decision through a mathematical scoring engine:

- **Buy/Sell signals** are computed from RSI, MACD, Moving Averages, and price position
- **DNA traits modulate** these signals (e.g., high contrarian bias inverts signals)
- **Confidence levels** and **risk assessments** are generated per decision
- **Stop-loss and take-profit** levels adapt to the agent's risk tolerance

#### Agent Registration (On-Chain)

Agents are registered on the **AgentFactory** smart contract on Monad Testnet:

- UUID is converted to `bytes32` for on-chain identification
- DNA traits are stored as integer percentages (0–100) on-chain
- Agents are linked to owner wallet addresses

---

### 2. Autonomous Trading

**Agents analyze real market data and execute trades automatically.**

#### How It Works

1. **Market Data Fetch** — Real-time prices from CoinGecko (BTC, ETH, SOL, AVAX, NEAR, ARB, OP)
2. **Technical Analysis** — Computes RSI, MACD, Moving Averages, trend, momentum, volatility
3. **DNA-Driven Decision** — The agent's DNA traits modulate all technical signals
4. **Trade Execution** — Autonomous buy/sell/hold decisions with configurable intervals
5. **On-Chain Settlement** — Trades settle through the DEX smart contract on Monad

#### Trading Interface Features

| Feature | Description |
|---------|-------------|
| **TradingView Chart** | Full candlestick charts with technical indicators |
| **Symbol Selector** | BTC, ETH, SOL, AVAX, NEAR, ARB, OP |
| **Interval Selector** | 1m, 5m, 15m, 30m, 1h, 4h |
| **Auto-Trading Toggle** | Start/stop autonomous trading at defined intervals |
| **Latest Decision Card** | Shows BUY/SELL/HOLD with confidence, reasoning, risk assessment |
| **Recent Trades** | Full trade history with P&L tracking and tx hashes |
| **Agent Portfolio** | Real-time balance and P&L overview |
| **News Ticker** | Scrolling market news feed |
| **Fund/Withdraw** | Send MON to or withdraw from agent wallets |

#### Trading Intervals

Users can configure autonomous trading intervals:
- **30s, 1m, 2m, 5m, 10m, 30m**

At each interval tick, the agent:
1. Fetches live market data
2. Generates a DNA-influenced trading decision
3. Executes on-chain if action is BUY or SELL
4. Records the trade with full metadata

---

### 3. Token Launch (nad.fun)

**Launch tokens for your AI agents on nad.fun's bonding curve mechanism.**

#### Launch Process

1. **Configure Token** — Name, symbol, description
2. **Set Utilities** — Revenue share %, governance toggle, access tiers
3. **Deploy on nad.fun** — Calls `BondingCurveRouter.create()` with 1 MON deploy fee
4. **Parse CurveCreate Event** — Extracts the new token address from the transaction
5. **Link to Agent** — Calls `AgentFactory.setAgentToken()` on-chain
6. **Save to Database** — Stores token metadata in Supabase

#### Token Configuration Options

| Option | Values |
|--------|--------|
| **Revenue Share** | 0–100% (slider) — token holders receive a share of agent winnings |
| **Governance** | On/Off — allows token holders to vote on strategy changes |
| **Access Tiers** | Public, Premium, VIP, Founder — tiered feature access |

#### Contract Addresses (Monad Testnet)

| Contract | Address |
|----------|---------|
| BondingCurveRouter | `0x6F6B8F1a20703309951a5127c45B49b1CD981A22` |
| BondingCurve | `0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE` |
| Lens | `0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea` |
| DexRouter | `0x0B79d71AE99528D1dB24A4148b5f4F865cc2b137` |

---

### 4. Esports Betting

**Bet on live and upcoming esports matches with real-time odds.**

#### Supported Games

| Game | Icon | API Slug |
|------|------|----------|
| All Games | 🎮 | `all` |
| League of Legends | ⚔️ | `lol` |
| CS2 | 🔫 | `cs2` |
| Dota 2 | 🏰 | `dota2` |
| Valorant | 🎯 | `valorant` |
| Rocket League | 🚗 | `rl` |
| Overwatch | 🦸 | `overwatch` |
| Rainbow Six | 🏰 | `r6siege` |

#### Betting Features

| Feature | Description |
|---------|-------------|
| **Live Matches** | Real-time scores and live streaming links (Twitch/YouTube) |
| **Upcoming Matches** | Browse and bet on future matches with countdown timers |
| **Match Results** | View finished matches and check bet outcomes |
| **Dynamic Odds** | Generated based on team rankings, world rank, and recent form |
| **Bet Tracking** | All bets stored locally with win/loss P&L tracking |
| **League Info** | Tournament name, series info (Bo3/Bo5), game scores |
| **Team Logos** | Real team images from PandaScore API |
| **Betting Deadline** | Betting closes at match start time with countdown |

#### Odds Generation

Odds are dynamically calculated using:
- Team ranking differences
- World rank comparison
- Random variance for market feel
- Minimum odds floor of 1.15

---

### 5. Arena & Leaderboard

**Agents compete in the Arena and climb the global leaderboard.**

#### Leaderboard

The leaderboard displays all agents ranked by performance:

| Metric | Description |
|--------|-------------|
| **Win Rate** | Percentage of matches won |
| **Total Matches** | Number of arena battles completed |
| **Total P&L** | Cumulative profit and loss percentage |
| **Total Won** | Total MON won across all matches |
| **Generation** | Evolutionary generation number |
| **Streak** | Current win/loss streak |

Agents are ranked by **Total Won** (descending). Top 3 agents receive 🥇🥈🥉 badges.

#### Agent Evolution

Agents can **evolve** their DNA traits:

- **AI-Assisted Evolution** — AI analyzes past performance and suggests optimal DNA adjustments
- **Manual Evolution** — Users fine-tune individual DNA traits with sliders
- **On-Chain Recording** — Evolution is recorded on the AgentFactory contract via `evolveAgent()`
- **Generation Tracking** — Each evolution increments the agent's generation counter
- **Mutation Count** — Tracks total number of DNA modifications

---

### 6. Faucets

**Get testnet tokens to start trading and betting.**

ClawTrader provides three faucet integrations:

| Faucet | Token | Description |
|--------|-------|-------------|
| **Monad Faucet** | MON | Links to the official Monad testnet faucet for native gas tokens |
| **USDC Faucet** | USDC | Mints testnet USDC by calling the USDC contract's mint function |
| **CLAW Faucet** | CLAW | Mints the platform's native CLAW token from a custom faucet contract |

The faucet cards are integrated directly into the platform header for easy access.

---

### 7. On-Chain Trading (DEX)

**Execute trades through a decentralized exchange on Monad.**

#### SimpleDEX Contract

The platform includes a `SimpleDEX` smart contract supporting:

| Function | Description |
|----------|-------------|
| `buyToken` | Buy tokens with MON input |
| `sellToken` | Sell tokens for MON output |
| `getBuyQuote` | Get expected output + fees for a buy |
| `getSellQuote` | Get expected output + fees for a sell |
| `getPrice` | Get current token price |
| `getPoolBalance` | Check liquidity pool balance |
| `isTokenSupported` | Check if a token is tradable |

#### Supported Trading Pairs

Trades are executed against multiple tokens tracked via CoinGecko prices:
- **BTC/USDT**, **ETH/USDT**, **SOL/USDT**, **AVAX/USDT**
- **NEAR/USDT**, **ARB/USDT**, **OP/USDT**

---

## Smart Contracts

### Deployed on Monad Testnet

| Contract | Purpose | Key Functions |
|----------|---------|---------------|
| **AgentFactory** | Register, evolve, and manage AI agents | `registerAgent()`, `evolveAgent()`, `setAgentToken()`, `getAgent()` |
| **SimpleDEX** | On-chain token trading | `buyToken()`, `sellToken()`, `getBuyQuote()`, `getSellQuote()` |
| **BondingCurveRouter** (nad.fun) | Launch tokens with bonding curves | `create()`, `buy()`, `sell()` |
| **Lens** (nad.fun) | Query prices and token status | `getAmountOut()`, `isGraduated()`, `getProgress()` |
| **USDC Mock** | Testnet USDC for trading | `mint()`, `approve()`, `transfer()` |
| **CLAW Token** | Platform native token with faucet | `faucet()`, `balanceOf()` |

### AgentFactory ABI Highlights

```solidity
registerAgent(bytes32 agentId, address owner, uint8 personality,
              uint8 riskTolerance, uint8 aggression, uint8 patternRecognition,
              uint8 timingSensitivity, uint8 contrarianBias)

evolveAgent(bytes32 agentId, uint8 newRisk, uint8 newAggression,
            uint8 newPattern, uint8 newTiming, uint8 newContrarian)

setAgentToken(bytes32 agentId, address tokenAddress)
```

---

## Backend Servers

### Trading Server (Port 3001)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server status, uptime |
| `/api/trade` | POST | Execute a trade for an agent |
| `/api/prices` | GET | Fetch current token prices |
| `/api/portfolio/:agentId` | GET | Get agent's portfolio |

Features:
- CORS enabled for cross-origin requests
- Fetches real CoinGecko market data
- On-chain trade execution via Monad RPC
- Trade history recording to Supabase

### Settlement Server (Port 3002)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server status, uptime |
| `/api/settle` | POST | Settle completed trades |
| `/api/matches` | GET | Get match results for settlement |

Features:
- Automated trade settlement
- P&L calculation and recording
- Win/loss determination for arena matches

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **UI Library** | shadcn/ui (Radix UI primitives) |
| **Styling** | Tailwind CSS with custom cyberpunk theme |
| **State Management** | React hooks + TanStack Query |
| **Routing** | React Router v6 |
| **Blockchain** | Monad Testnet (EVM-compatible) |
| **Wallet Integration** | wagmi v2 + viem (MetaMask, Rabby, etc.) |
| **Database** | Supabase (PostgreSQL + Realtime) |
| **Backend** | Node.js + Express |
| **Process Manager** | PM2 (production) |
| **Charts** | TradingView widget |
| **Esports Data** | PandaScore API |
| **Market Data** | CoinGecko API |
| **Token Launch** | nad.fun Bonding Curve Protocol |
| **Deployment** | Vultr VPS |

---

## Token Utilities & Governance

### Revenue Sharing

When a token is launched with revenue share enabled:
- A percentage (0–100%) of the agent's trading profits is distributed to token holders
- Revenue distribution records are tracked in the `revenue_distributions` table
- Holders can view their earned revenue in the Token Dashboard

### Governance (DAO)

When governance is enabled for an agent token:
- Token holders can **create proposals** to modify agent strategy DNA
- Proposals have configurable voting duration (default: 24 hours)
- Each holder's **vote power** corresponds to their token balance
- Proposal types: `strategy`, `dna`, `alliance`, `other`
- Proposals track `votes_for` and `votes_against` with automatic tallying

### Access Tiers

Tokens unlock tiered features based on holder balance:

| Tier | Features |
|------|----------|
| **Public** | View stats, match outcomes |
| **Premium** | Early betting, strategy insights |
| **VIP** | Governance voting, DNA modification proposals |
| **Founder** | Alliance control, full platform access |

---

## API Integrations

### CoinGecko (Market Data)

- **Purpose**: Real-time cryptocurrency price data for AI trading decisions
- **Rate Limit**: Free tier, with caching
- **Data**: Current price, 24h change, volume, high/low, market cap
- **Tokens**: BTC, ETH, SOL, AVAX, NEAR, ARB, OP

### PandaScore (Esports Data)

- **Purpose**: Live, upcoming, and finished esports match data
- **Rate Limit**: 900 requests/hour (60-second cache implemented)
- **Data**: Match details, team info, scores, streaming URLs, tournament info
- **Games**: LoL, CS2, Dota 2, Valorant, Rocket League, Overwatch, R6 Siege

### Supabase (Database + Auth)

- **Purpose**: PostgreSQL database for all platform data + real-time subscriptions
- **Tables**: `agents`, `profiles`, `matches`, `agent_token_holders`, `governance_proposals`, `governance_votes`, `revenue_distributions`, `access_grants`
- **Realtime**: Live updates for token holder changes and proposal voting

### Monad RPC

- **URL**: `https://testnet-rpc.monad.xyz`
- **Chain ID**: 10143
- **Purpose**: All on-chain transactions (agent registration, trading, token launch)

---

## Pages & Navigation

| Page | Route | Description |
|------|-------|-------------|
| **Home** | `/` | Landing page with hero, features, stats, CLAW token section, CTA |
| **Trading** | `/trading` | Full trading dashboard with AI agent selection and autonomous mode |
| **Agents** | `/agents` | Create, manage, evolve agents; launch tokens; view token dashboards |
| **Betting** | `/betting` | Esports betting with live/upcoming/finished match tabs |
| **Leaderboard** | `/leaderboard` | Global agent rankings by performance |
| **Privacy Policy** | `/privacy-policy` | Platform privacy policy |
| **Terms of Service** | `/terms-of-service` | Platform terms of service |

### Header Components

- **Logo & Navigation** — ClawTrader branding with page links
- **Faucet Dropdown** — Quick access to MON, USDC, and CLAW faucets
- **Server Status** — Live indicators for Trading (3001) and Settlement (3002) servers
- **Theme Toggle** — Light/Dark mode switch
- **Wallet Connect** — MetaMask/Rabby wallet integration via wagmi

---

## Environment & Deployment

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_TRADING_SERVER_URL` | `http://96.30.205.215:3001` | Trading server endpoint |
| `VITE_SETTLEMENT_SERVER_URL` | `http://96.30.205.215:3002` | Settlement server endpoint |

### Production Deployment (Vultr)

- **Server**: Vultr VPS at `96.30.205.215`
- **Process Manager**: PM2 for Node.js servers
- **Ports**: 3001 (Trading), 3002 (Settlement)
- **Firewall**: UFW with ports 22, 3001, 3002 open

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start backend servers
node server/trading-server.js
node server/settlement-server.js
```

---

## Design Philosophy

ClawTrader embraces a **cyberpunk-inspired** aesthetic:

- **Dark theme** with neon accents (primary green, secondary purple)
- **Glassmorphism** effects on cards and modals
- **Glow effects** on interactive elements
- **Micro-animations** for state transitions
- **Custom font** — display font for headings, clean sans-serif for body
- **Responsive design** — optimized for desktop and mobile

---

> **Built for the Monad ecosystem** — ClawTrader demonstrates the potential of high-performance EVM chains for AI-driven DeFi applications, combining autonomous trading agents, community governance, and real-world esports data in one platform.
