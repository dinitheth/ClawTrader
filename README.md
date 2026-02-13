# ClawTrader -- AI Trading Arena on Monad

ClawTrader is a decentralized AI trading arena built on the Monad blockchain. Users create autonomous trading agents with customizable Strategy DNA, compete in head-to-head matches, place bets on live esports, and trade cryptocurrencies through AI-driven decisions -- all powered by on-chain smart contracts.

---

## Table of Contents

- [System Overview](#system-overview)
- [Architecture](#architecture)
- [Pages and Features](#pages-and-features)
  - [Arena (Home)](#arena-home)
  - [Autonomous Trading](#autonomous-trading)
  - [Esports Betting](#esports-betting)
  - [My Agents](#my-agents)
  - [Leaderboard](#leaderboard)
- [Smart Contract Integration](#smart-contract-integration)
  - [Contract Addresses](#contract-addresses)
  - [AgentFactory](#agentfactory)
  - [AgentVaultV2](#agentvaultv2)
  - [BettingEscrow](#bettingescrow)
  - [ClawArena](#clawarena)
  - [SimpleDEX](#simpledex)
  - [ClawSwap](#clawswap)
  - [ClawToken](#clawtoken)
- [Strategy DNA System](#strategy-dna-system)
- [AI Decision Engine](#ai-decision-engine)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Services and APIs](#services-and-apis)
- [Development](#development)
- [Deployment and Hosting](#deployment-and-hosting)
- [Environment Variables](#environment-variables)
- [License](#license)

---

## System Overview

ClawTrader combines three core systems into a single platform:

1. **Autonomous Trading** -- AI agents analyze real-time market data and execute trades on a decentralized exchange (SimpleDEX) using strategy encoded in their on-chain DNA.

2. **Esports Betting** -- Users wager CLAW tokens on live and upcoming esports matches sourced from the PandaScore API, with bets settled through the BettingEscrow smart contract.

3. **Agent Economy** -- Each AI agent is registered on-chain via AgentFactory, can evolve its DNA over time, and can launch a tradeable token on nad.fun through the BondingCurveRouter.

```
+-------------------------------------------------------------------+
|                        ClawTrader Frontend                        |
|                    (React + Vite + TypeScript)                    |
+-------------------------------------------------------------------+
|    Arena    |   Trading   |   Betting   |  My Agents  | Leaderboard|
+-------------------------------------------------------------------+
         |             |              |            |
         |             |              |            |
   +-----v------+ +---v-----+ +------v-----+ +---v-----------+
   | Supabase   | | CoinGecko| | PandaScore | | wagmi / viem  |
   | (Database, | | (Market  | | (Esports   | | (Wallet +     |
   |  Auth,     | |  Prices) | |  Match     | |  Contract     |
   |  Edge Fn)  | |          | |  Data)     | |  Interaction) |
   +-----+------+ +----+----+ +------+-----+ +---+-----------+
         |              |             |            |
         |              |             |            |
   +-----v--------------v-------------v------------v-----------+
   |                    Monad Testnet (Chain ID: 10143)         |
   |                                                            |
   |  AgentFactory | AgentVaultV2 | SimpleDEX | BettingEscrow  |
   |  ClawToken    | ClawArena    | ClawSwap  | TestUSDC       |
   +------------------------------------------------------------+
   |                  nad.fun (Token Launch)                     |
   |          BondingCurveRouter | Curve | Lens                 |
   +------------------------------------------------------------+
```

---

## Architecture

### Data Flow

```
User Action
    |
    v
React Component (Page)
    |
    +---> Supabase Client (Database reads/writes)
    |         |
    |         v
    |     Supabase PostgreSQL (agents, matches, bets, profiles)
    |     Supabase Edge Functions (ai-trading-analysis, simulate-match)
    |
    +---> wagmi/viem (Smart Contract Calls)
    |         |
    |         v
    |     Monad Testnet RPC (https://testnet-rpc.monad.xyz)
    |         |
    |         v
    |     Smart Contracts (AgentFactory, AgentVaultV2, SimpleDEX, etc.)
    |
    +---> External APIs
              |
              +---> CoinGecko API (crypto market data)
              +---> PandaScore API (esports match data)
              +---> TradingView Widget (price charts)
```

### State Management

- **Supabase Realtime**: Live match updates via PostgreSQL change subscriptions
- **React State**: Local component state with `useState` and `useEffect`
- **React Query**: Server state caching via `@tanstack/react-query`
- **wagmi Hooks**: Wallet connection state, contract reads, and transaction management
- **localStorage**: Esports bet history and trade logs for client-side persistence

---

## Pages and Features

### Arena (Home)

**Route**: `/`

The landing page provides an overview of the entire platform.

**Components**:
- `HeroSection` -- Platform introduction and call-to-action
- `FeaturesSection` -- Feature highlights for Trading, Betting, and Agents
- `StatsSection` -- Real-time statistics (active agents, matches played, total volume, trader count)
- `LiveMatchCard` -- Cards displaying currently active agent-vs-agent matches
- `AgentLeaderRow` -- Top-performing agents ranked by winnings

**Data Sources**:
- `agentService.getLeaderboard(5)` fetches top 5 agents from Supabase
- `matchService.getRecent(4)` fetches recent matches with joined agent data
- `profileService.getProfileCount()` fetches real registered user count
- `matchService.subscribeToLiveMatches()` provides real-time match updates via Supabase Realtime channels

**Auto-refresh**: Stats refresh every 30 seconds.

### Autonomous Trading

**Route**: `/trading`

The autonomous trading page enables AI agents to analyze markets and execute trades on-chain.

```
User selects Agent and Market Symbol
              |
              v
    +-------------------+
    | CoinGecko API     |  <-- fetchMarketData(coinId)
    | (Real-time price, |      Returns: currentPrice, priceChange24h,
    |  volume, high/low)|      volume24h, high24h, low24h
    +--------+----------+
             |
             v
    +-------------------+
    | DNA Decision      |  <-- generateLocalDecision(agentDNA, marketData, personality)
    | Engine            |
    |                   |      DNA Values (0-100 each):
    | Inputs:           |        riskTolerance -> stop-loss width
    |  - Agent DNA      |        aggression    -> position size
    |  - Market Data    |        patternRecog  -> technical indicator weight
    |  - Personality    |        contrarianBias-> signal inversion
    |  - Balance        |        timingSensit  -> action threshold
    +--------+----------+
             |
             v
    +-------------------+
    | Trading Decision  |  Output:
    |  - BUY/SELL/HOLD  |    action, confidence, reasoning,
    |  - Confidence %   |    suggestedAmount, stopLoss, takeProfit,
    |  - Position Size  |    technicalAnalysis, riskAssessment
    +--------+----------+
             |
             v
    +-------------------+       +-------------------+
    | ExecuteTradeModal |------>| SimpleDEX Contract|
    | (User Confirms)   |      | swapExactInput()  |
    +-------------------+       | (On-chain trade)  |
                                +-------------------+
```

**Components**:
- `TradingViewChart` -- Embedded TradingView chart widget for price visualization
- `SymbolSelector` -- Dropdown for selecting trading pairs (BTC, ETH, SOL, AVAX, NEAR, ARB, OP)
- `IntervalSelector` -- Chart timeframe selector (1m, 5m, 15m, 1h, 4h, 1D)
- `LatestDecisionCard` -- Displays the AI decision with action, confidence, reasoning, technical analysis, risk assessment, position size, stop-loss, and take-profit levels
- `ExecuteTradeModal` -- Confirmation dialog for executing on-chain trades via SimpleDEX
- `FundAgentModal` -- USDC deposit dialog (approve + deposit to AgentVaultV2)
- `WithdrawModal` -- USDC withdrawal dialog from AgentVaultV2
- `RecentTrades` -- Trade history with P&L tracking
- `NewsTicker` -- Market news scroll

**Auto-Trading Mode**: When enabled, the system automatically:
1. Fetches market data from CoinGecko every 30 seconds
2. Runs the DNA-driven decision engine
3. Executes trades on SimpleDEX if confidence exceeds threshold
4. Logs all decisions and trades

**On-Chain Flow**:
1. User deposits USDC into AgentVaultV2 (`approve` + `deposit`)
2. Agent analyzes market data using DNA-weighted technical signals
3. Trade executes via SimpleDEX (`swapExactInput` or `swapExactOutput`)
4. Agent vault balance updates on-chain

### Esports Betting

**Route**: `/betting`

Users wager CLAW tokens on real esports matches from multiple games.

```
+-------------------+
| PandaScore API    |  <-- Fetches live + upcoming matches
| (900 req/hr,      |      Games: LoL, CS2, Dota 2, Valorant,
|  60s cache)       |      Rocket League, Overwatch, R6 Siege
+--------+----------+
         |
         v
+-------------------+
| Match Cards       |  Each card shows:
| - Team logos      |    - Team names and images
| - Live scores    |    - Current game scores (for live matches)
| - Countdown      |    - Time until betting closes
| - Odds           |    - Generated odds based on team stats
| - Bet Input      |    - Inline betting with amount input
+--------+----------+
         |
         v
+-------------------+        +----------------------+
| Place Bet         |------->| BettingEscrow        |
| (CLAW tokens)     |        | Contract             |
+-------------------+        | placeBet()           |
                              | - Locks CLAW tokens  |
                              | - Records bet params |
                              | - Emits BetPlaced    |
                              +----------+-----------+
                                         |
                              (After match ends)
                                         |
                                         v
                              +----------------------+
                              | settleBets()         |
                              | - Oracle reports     |
                              |   winner             |
                              | - Winners get payout |
                              | - Losers lose stake  |
                              +----------------------+
```

**Data Sources**:
- `fetchRunningMatches()` -- Currently live esports matches
- `fetchUpcomingMatches()` -- Matches starting within 24 hours
- PandaScore API provides team data, scores, streams, league info, and series details

**Supported Games**: League of Legends, CS2, Dota 2, Valorant, Rocket League, Overwatch, Rainbow Six Siege

**Features**:
- Game filter tabs for each esport
- Live score updates for running matches
- Countdown timer to betting deadline (closes at match start time)
- Odds generation based on team statistics and historical performance
- Inline bet placement on match cards
- Match detail modal with stream embed, series info, and bet history
- Bet tracking via localStorage for persistence
- CLAW token balance display and swap access

### My Agents

**Route**: `/agents`

Users create, manage, evolve, and tokenize their AI trading agents.

```
+-------------------+       +--------------------+
| Create Agent      |       | AgentFactory       |
| Modal             |------>| Contract           |
|                   |       |                    |
| - Agent Name      |       | createAgent()      |
| - Avatar (emoji)  |       | Parameters:        |
| - Personality     |       |  - id (bytes32)    |
| - Strategy DNA    |       |  - name            |
|   (5 sliders)     |       |  - avatar          |
| - Experimental    |       |  - personality     |
|   traits          |       |  - dnaRisk         |
+--------+----------+       |  - dnaAggression   |
         |                   |  - dnaPattern      |
         v                   |  - dnaTiming       |
+-------------------+       |  - dnaContrarian   |
| Supabase Insert   |       +--------------------+
| agents table      |
+-------------------+

Agent ID Generation:
  keccak256(abi.encodePacked(agentName, walletAddress, timestamp))
  This produces a unique bytes32 ID linking the on-chain and off-chain records.
```

**Agent Creation Flow**:
1. User fills in name, selects avatar and personality
2. User configures Strategy DNA via five sliders (0-100 each)
3. Frontend generates a bytes32 agent ID using `keccak256(name + address + timestamp)`
4. Transaction sent to `AgentFactory.createAgent()` on Monad Testnet
5. On confirmation, agent metadata saved to Supabase `agents` table
6. Agent appears in the user's agent list

**Token Launch Flow** (via nad.fun -- 5-Step Process):
1. User opens LaunchTokenModal for a specific agent
2. Fills in token name, symbol, and description
3. Configures token utilities (revenue share %, governance toggle, access tier)
4. Frontend executes the **nad.fun 5-step creation flow**:
   - **Step 1**: Generate token image (512x512 PNG from agent avatar) and upload via `POST dev-api.nad.fun/agent/token/image`
   - **Step 2**: Upload metadata (name, symbol, description, image_uri) via `POST dev-api.nad.fun/agent/token/metadata`
   - **Step 3**: Mine salt via `POST dev-api.nad.fun/agent/salt` -- returns salt + predicted token address
   - **Step 4**: Read deploy fee from `Curve.feeConfig()` (currently **10 MON** on testnet)
   - **Step 5**: Create on-chain via `BondingCurveRouter.create()` with `actionId: 1` and deploy fee
5. Transaction receipt parsed for `CurveCreate` event to extract token address (falls back to predicted address from step 3)
6. `AgentFactory.setAgentToken(agentId, tokenAddress)` links token to agent on-chain
7. Token metadata saved to Supabase (address, name, symbol, market cap, holders)

**Agent Actions**:
- **View** -- Navigate to trading page with agent pre-selected
- **Evolve** -- Update DNA values on-chain via `AgentFactory.evolveAgent()`
- **Arena** -- Enter agent into head-to-head matches
- **Launch Token** -- Create tradeable token on nad.fun bonding curve (10 MON deploy fee)

### Leaderboard

**Route**: `/leaderboard`

Ranks all agents by performance metrics.

**Tabs**:
- **All Time** -- Sorted by total winnings (CLAW earned across all matches)
- **By P&L** -- Sorted by total profit and loss
- **Hot Streak** -- Filtered to agents with active win streaks

**Summary Stats Bar**: Displays total agents, total matches, total trading volume, and the name of the current top-performing agent.

**Auto-refresh**: Data reloads every 30 seconds. Manual refresh button available.

---

## Smart Contract Integration

All contracts are deployed on **Monad Testnet** (Chain ID: `10143`).

### Contract Addresses

| Contract | Address | Purpose |
|---|---|---|
| AgentFactory | `0x11bCcC1FE610B42A2649467C38eBA52Aa32F8a05` | On-chain agent registration and DNA storage |
| AgentVaultV2 | `0x50646200817C52BFa61a5398b3C6dcf217b606Cf` | USDC deposits, withdrawals, and trade execution |
| BettingEscrow | `0x41d521347068B09bfFE2E2bba9946FC9368c6A17` | Parimutuel esports betting escrow |
| ClawArena | (deployed) | Head-to-head agent competition management |
| ClawSwap | (deployed) | MON-to-CLAW token swap |
| SimpleDEX | `0x7f09C84a42A5f881d8cebC3c319DC108c20eE762` | Decentralized exchange for agent trades |
| ClawToken | `0x849DC7064089e9f47c3d102E224302C72b5aC134` | Platform ERC-20 token (18 decimals) |
| TestUSDC | `0xE5C0a7AB54002FeDfF0Ca7082d242F9D04265f3b` | Mintable test USDC (6 decimals) with faucet |
| TestBTC | `0x8C56E4d502C544556b76bbC4b8f7E7Fc58511c87` | Test Bitcoin token (8 decimals, 21M supply) |
| TestETH | `0x3809C6E3512c409Ded482240Bd1005c1c40fE5e4` | Test Ethereum token (18 decimals, 120M supply) |
| TestSOL | `0xD02dB25175f69A1b1A03d6F6a8d4A566a99061Af` | Test Solana token (9 decimals, 500M supply) |
| VaultB | `0x43236A83599Ce79557ad218ca1aF6109B2400d31` | USDC profit distribution vault |

**nad.fun Contracts (Token Launch -- Monad Testnet)**:

| Contract | Address |
|---|---|
| BondingCurveRouter | `0x865054F0F6A288adaAc30261731361EA7E908003` |
| Curve | `0x1228b0dc9481C11D3071E7A924B794CfB038994e` |
| Lens | `0xB056d79CA5257589692699a46623F901a3BB76f1` |
| DEX Router | `0x5D4a4f430cA3B1b2dB86B9cFE48a5316800F5fb2` |
| DEX Factory | `0xd0a37cf728CE2902eB8d4F6f2afc76854048253b` |
| WMON | `0x5a4E0bFDeF88C9032CB4d24338C5EB3d3870BfDd` |
| Creator Treasury | `0x24dFf9B68fA36f8400302e2babC3e049eA19459E` |

### AgentFactory

**Source**: `contracts/AgentFactory.sol`

Registers AI agents on-chain with immutable DNA. Inherits OpenZeppelin `Ownable`.

**Key Functions**:
- `createAgent(id, name, avatar, personality, dnaRisk, dnaAggression, dnaPattern, dnaTiming, dnaContrarian)` -- Registers agent with DNA on-chain
- `setAgentToken(id, tokenAddress)` -- Links a nad.fun token to the agent (callable by agent owner or contract owner)
- `evolveAgent(id, newDna...)` -- Updates DNA values and increments generation counter
- `getAgent(id)` -- Returns full agent struct
- `uuidToBytes32(uuid)` -- Converts UUID string to bytes32 via keccak256

**Events**: `AgentCreated`, `AgentTokenLaunched`, `AgentEvolved`

### AgentVaultV2

**Source**: `contracts/AgentVaultV2.sol`

Holds user USDC deposits and executes trades through SimpleDEX on behalf of agents.

**Key Functions**:
- `deposit(amount)` -- Deposits USDC (requires prior ERC-20 approval)
- `withdraw(amount)` -- Withdraws USDC to caller
- `executeTrade(tokenIn, tokenOut, amountIn)` -- Executes swap via SimpleDEX
- `getBalance(user)` -- Returns user USDC balance in vault

### BettingEscrow

**Source**: `contracts/BettingEscrow.sol`

Manages parimutuel betting for esports matches using CLAW tokens.

**Key Functions**:
- `placeBet(matchId, teamId, amount)` -- Locks CLAW tokens and records bet
- `settleBets(matchId, winnerId)` -- Distributes pool to winners (oracle-triggered)
- `refundBets(matchId)` -- Refunds all bets for cancelled matches

### SimpleDEX

**Source**: `contracts/SimpleDEX.sol`

A decentralized exchange supporting token swaps at oracle-sourced prices. Used by AgentVaultV2 for executing AI-directed trades.

### ClawToken

**Source**: `contracts/ClawToken.sol`

ERC-20 platform token used for arena betting, agent competitions, and esports wagering.

### ClawSwap

**Source**: `contracts/ClawSwap.sol`

Enables swapping MON (native token) for CLAW tokens.

---

## Strategy DNA System

Every agent has five DNA traits stored on-chain (0-100 scale). These directly control trading behavior:

| DNA Trait | Value 0 | Value 50 | Value 100 | Effect |
|---|---|---|---|---|
| Risk Tolerance | Conservative (2% stop-loss) | Moderate (6% stop-loss) | Degen (10% stop-loss) | Controls stop-loss width and take-profit targets |
| Aggression | Passive (5% position) | Balanced (27% position) | Attack Mode (50% position) | Controls position size per trade |
| Pattern Recognition | Intuitive (uses price action) | Mixed (blends both) | Pattern God (relies on RSI, MACD, MAs) | Determines weight of technical indicators vs simple price action |
| Timing Sensitivity | YOLO (acts on 5% signal) | Flexible (25% threshold) | Perfect Entry (needs 45% signal) | Sets minimum signal strength to trigger a trade |
| Contrarian Bias | Follow Crowd (uses signals as-is) | Mixed | Always Fade (inverts all signals) | When above 60, partially or fully inverts the trading signal |

### DNA-to-Behavior Mapping

During agent creation, users configure these five sliders. The values are:
- Written on-chain to AgentFactory (permanent record)
- Stored in Supabase agents table (fast access)
- Read by the trading decision engine on every analysis cycle

A value of 100 represents maximum skill or tendency in that trait. A value of 0 represents minimum. The midpoint of 50 represents balanced behavior.

---

## AI Decision Engine

The decision engine lives in `src/lib/trading-service.ts` and operates in two modes:

### Mode 1: Supabase Edge Function (Primary)

Calls the `ai-trading-analysis` edge function with agent DNA, market data, personality, and portfolio balance. This function can use external AI models for sophisticated analysis.

### Mode 2: Local DNA Engine (Fallback)

When the edge function is unavailable, the local engine uses a deterministic algorithm:

1. **Compute Technical Signals**: Trend direction, momentum, volatility, RSI signal, MACD signal, moving average confluence, and price position within daily range.

2. **DNA-Weighted Aggregation**: Pattern Recognition DNA determines how much weight goes to technical indicators (high) vs simple price action (low).

3. **Contrarian Inversion**: If Contrarian Bias DNA exceeds 60, the signal is partially or fully inverted.

4. **Timing Threshold**: Timing Sensitivity DNA sets the minimum signal strength required to act. Low values cause frequent trading; high values cause the agent to wait for strong signals.

5. **Personality Modifiers**: Each personality type adds a behavioral overlay:
   - Aggressive: Amplifies buy signals
   - Cautious: Reduces position aggressiveness
   - Deceptive: 15% chance of contrarian play
   - Chaotic: Adds random noise to decision
   - Calculating: Increases confirmation requirements
   - Adaptive: Balances all factors

6. **Position Sizing**: Aggression DNA directly controls position size (5% to 50% of portfolio).

7. **Risk Management**: Risk Tolerance DNA controls stop-loss width (2% to 10%) and take-profit targets (3% to 15%).

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI component library |
| TypeScript | 5.8 | Type-safe JavaScript |
| Vite | 5.4 | Build tool and dev server |
| TailwindCSS | 3.4 | Utility-first CSS framework |
| Shadcn/UI | (latest) | Pre-built accessible UI components (Dialog, Card, Tabs, Badge, etc.) |
| React Router | 6.30 | Client-side routing |
| React Query | 5.90 | Async state management and caching |
| Recharts | 2.15 | Data visualization |
| Lucide React | 0.462 | Icon library |

### Web3

| Technology | Version | Purpose |
|---|---|---|
| wagmi | 3.4 | React hooks for Ethereum (wallet connection, contract interaction) |
| viem | 2.45 | Low-level Ethereum utilities (ABI encoding, hashing, event decoding) |
| ethers | 6.16 | Ethereum library (supplementary) |
| nadfun/sdk | 0.4 | nad.fun integration for token launches |

### Backend

| Technology | Purpose |
|---|---|
| Supabase | PostgreSQL database, authentication, Edge Functions, Realtime subscriptions |
| Supabase Edge Functions | Server-side logic (AI trading analysis, match simulation) |

### Smart Contracts

| Technology | Purpose |
|---|---|
| Solidity | ^0.8.20 |
| OpenZeppelin | Access control (Ownable), ERC-20 implementations |
| Foundry | Smart contract development framework |
| Hardhat | Alternative contract tooling |

### External APIs

| API | Purpose | Rate Limit |
|---|---|---|
| CoinGecko | Crypto market prices, 24h change, volume, high/low | Public (free tier) |
| PandaScore | Live esports match data, team info, scores, streams | 900 req/hr (60s cache) |
| TradingView | Embedded price chart widget | Widget-based |
| Monad Testnet RPC | Blockchain interaction | `https://testnet-rpc.monad.xyz` |

---

## Project Structure

```
moltiverse-mastermind/
|
|-- contracts/                    # Solidity smart contracts
|   |-- AgentFactory.sol          # On-chain agent registration
|   |-- AgentVaultV2.sol          # USDC vault + trade execution
|   |-- BettingEscrow.sol         # Esports betting escrow
|   |-- ClawArena.sol             # Agent competition management
|   |-- ClawSwap.sol              # MON-to-CLAW swap
|   |-- ClawToken.sol             # Platform ERC-20 token
|   |-- SimpleDEX.sol             # Token swap DEX
|   |-- TestUSDC.sol              # Mintable test USDC
|   |-- TestBTC.sol               # Test Bitcoin token
|   |-- TestETH.sol               # Test Ethereum token
|   |-- TestSOL.sol               # Test Solana token
|   |-- VaultB.sol                # Profit distribution vault
|   |-- foundry.toml              # Foundry configuration
|   |-- hardhat.config.js         # Hardhat configuration
|   `-- scripts/                  # Deployment scripts
|
|-- src/
|   |-- pages/
|   |   |-- Index.tsx             # Arena/Home page
|   |   |-- Trading.tsx           # Autonomous trading page
|   |   |-- Betting.tsx           # Esports betting page
|   |   |-- Agents.tsx            # My Agents page
|   |   `-- Leaderboard.tsx       # Leaderboard page
|   |
|   |-- components/
|   |   |-- agents/
|   |   |   |-- CreateAgentModal.tsx    # Agent creation with DNA config
|   |   |   `-- LaunchTokenModal.tsx    # nad.fun token launch
|   |   |-- arena/
|   |   |   |-- LiveMatchCard.tsx       # Live match display
|   |   |   `-- AgentLeaderRow.tsx      # Leaderboard row
|   |   |-- betting/
|   |   |   `-- MatchDetailModal.tsx    # Esports match details + betting
|   |   |-- trading/
|   |   |   |-- ExecuteTradeModal.tsx   # Trade confirmation
|   |   |   |-- FundAgentModal.tsx      # USDC deposit
|   |   |   |-- WithdrawModal.tsx       # USDC withdrawal
|   |   |   |-- LatestDecisionCard.tsx  # AI decision display
|   |   |   |-- RecentTrades.tsx        # Trade history
|   |   |   |-- TradingViewChart.tsx    # Price chart widget
|   |   |   `-- NewsTicker.tsx          # Market news
|   |   |-- landing/
|   |   |   |-- HeroSection.tsx         # Landing hero
|   |   |   |-- FeaturesSection.tsx     # Feature highlights
|   |   |   `-- StatsSection.tsx        # Real-time platform stats
|   |   |-- layout/
|   |   |   |-- Header.tsx              # Navigation bar
|   |   |   `-- Layout.tsx              # Page wrapper
|   |   |-- swap/
|   |   |   `-- SwapModal.tsx           # Token swap dialog
|   |   `-- ui/                         # Shadcn UI components
|   |
|   |-- lib/
|   |   |-- api.ts                # Supabase CRUD operations (agents, matches, profiles, bets)
|   |   |-- contracts.ts          # Contract addresses, ABIs, helper functions
|   |   |-- trading-service.ts    # AI decision engine + CoinGecko integration
|   |   |-- pandaScore.ts         # PandaScore esports API client
|   |   |-- priceService.ts       # Multi-token price fetching
|   |   |-- etherscan.ts          # Trade history + explorer URL generation
|   |   |-- nadfun.ts             # nad.fun token data fetching (Lens contract)
|   |   |-- monad-dex.ts          # Monad DEX utilities
|   |   |-- monad-faucet.ts       # Testnet faucet integration
|   |   |-- wagmi.ts              # wagmi configuration (chains, connectors, RPC)
|   |   |-- usdc-config.ts        # USDC-related configuration
|   |   |-- errors.ts             # Error parsing and user-friendly formatting
|   |   `-- utils.ts              # General utilities
|   |
|   |-- hooks/
|   |   |-- useClawSwap.ts        # CLAW token swap hook
|   |   |-- useClawBetting.ts     # On-chain betting hook
|   |   |-- useSimpleDEX.ts       # SimpleDEX trading hook
|   |   |-- useAgentVaultBalance.ts # Vault balance reading hook
|   |   |-- useTokenPrices.ts     # Token price fetching hook
|   |   |-- use-toast.ts          # Toast notification hook
|   |   `-- use-mobile.tsx        # Mobile detection hook
|   |
|   `-- integrations/
|       `-- supabase/
|           |-- client.ts         # Supabase client initialization
|           `-- types.ts          # Auto-generated database types
|
|-- public/                       # Static assets
|-- index.html                    # HTML entry point
|-- package.json                  # Dependencies and scripts
|-- vite.config.ts                # Vite build configuration
|-- tailwind.config.ts            # TailwindCSS configuration
`-- tsconfig.json                 # TypeScript configuration
```

---

## Services and APIs

### Supabase Services (`src/lib/api.ts`)

| Service | Functions | Description |
|---|---|---|
| `agentService` | `getAll`, `getByOwner`, `getById`, `create`, `update`, `getLeaderboard`, `getAvailableForMatch` | Full CRUD for AI agents |
| `matchService` | `getAll`, `getLive`, `getPending`, `getRecent`, `create`, `startSimulation`, `subscribeToMatch`, `subscribeToLiveMatches` | Match management with real-time subscriptions |
| `profileService` | `getOrCreateByWallet`, `getByWallet`, `getProfileCount` | User profile management (auto-created on wallet connect) |
| `bettingService` | `placeBet`, `getBetsForMatch`, `getUserBets` | Bet CRUD operations |

### PandaScore Service (`src/lib/pandaScore.ts`)

Fetches live and upcoming esports match data. Implements a 60-second in-memory cache to stay under the 900 requests/hour rate limit. Provides helper functions for stream URLs, team scores, game display names, badge colors, and series info.

### Trading Service (`src/lib/trading-service.ts`)

Contains the DNA-driven decision engine (`generateLocalDecision`) and CoinGecko market data fetching (`fetchMarketData`). Supports seven trading pairs mapped to CoinGecko IDs: BTC, ETH, SOL, AVAX, NEAR, ARB, OP.

### Price Service (`src/lib/priceService.ts`)

Fetches real-time token prices for the SimpleDEX trading pairs. Used by the trading page to display current token values.

### Etherscan Service (`src/lib/etherscan.ts`)

Manages trade history in localStorage and generates Monad explorer URLs for transaction verification.

### nad.fun Service (`src/lib/nadfun.ts`)

Interacts with nad.fun Lens contract to fetch token holder data, bonding curve prices, and token metadata for agent tokens.

---

## Development

### Prerequisites

- Node.js >= 18
- npm or yarn
- MetaMask or compatible Web3 wallet configured for Monad Testnet

### Setup

```bash
# Clone the repository
git clone https://github.com/dinitheth/ClawTrader-V2.git
cd ClawTrader-V2

# Install dependencies
npm install

# Configure environment variables (see Environment Variables section)
cp .env.example .env

# Start development server
npm run dev
```

The development server starts at `http://localhost:8080` by default.

### Available Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start Vite development server with hot reload |
| `build` | `npm run build` | Production build |
| `build:dev` | `npm run build:dev` | Development build |
| `preview` | `npm run preview` | Preview production build locally |
| `lint` | `npm run lint` | Run ESLint |
| `test` | `npm run test` | Run tests with Vitest |
| `test:watch` | `npm run test:watch` | Run tests in watch mode |

### Smart Contract Development

Contracts are in the `contracts/` directory and can be compiled with either Foundry or Hardhat:

```bash
cd contracts

# Using Foundry
forge build
forge test

# Using Hardhat
npx hardhat compile
```

### Adding Monad Testnet to Wallet

| Field | Value |
|---|---|
| Network Name | Monad Testnet |
| Chain ID | 10143 |
| RPC URL | `https://testnet-rpc.monad.xyz` |
| Currency Symbol | MON |
| Block Explorer | `https://testnet.monadexplorer.com` |

---

## Deployment and Hosting

### Frontend (Vercel -- Recommended)

The frontend is a Vite + React SPA. Deploy to **Vercel** in minutes:

#### Step-by-Step Vercel Deployment

1. **Push to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Update for deployment"
   git push origin main
   ```

2. **Sign up / Log in**: Go to [vercel.com](https://vercel.com) and sign in with your GitHub account.

3. **Import Project**:
   - Click **"Add New" → "Project"**
   - Select the **ClawTrader-V2** repository from your GitHub
   - Click **"Import"**

4. **Configure Build Settings**:
   | Setting | Value |
   |---|---|
   | Framework Preset | **Vite** |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Install Command | `npm install` |

5. **Add Environment Variables**:
   - Click **"Environment Variables"** and add:
   
   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | Your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

6. **Deploy**: Click **"Deploy"**. Vercel will build and deploy automatically.

7. **Custom Domain** (Optional):
   - Go to **Settings → Domains**
   - Add your custom domain and follow the DNS instructions

8. **Auto-Deployments**: Every push to `main` branch triggers an automatic redeployment.

#### Vercel Configuration (vercel.json)

For SPA routing, create a `vercel.json` in the project root:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This ensures all routes are handled by React Router instead of returning 404.

### Other Hosting Options

- **Netlify**: Connect GitHub repo, set build command to `npm run build`, publish directory to `dist`
- **Cloudflare Pages**: Similar setup, connect repo and configure build settings
- **Self-hosted**: Run `npm run build` and serve the `dist/` folder with any static file server (Nginx, Apache, etc.)

### Backend (Supabase)

- **Database**: Supabase PostgreSQL hosts all application data (agents, matches, bets, profiles)
- **Edge Functions**: Deployed on Supabase infrastructure. Functions include `ai-trading-analysis` (AI decision-making) and `simulate-match` (match simulation)
- **Realtime**: Supabase Realtime channels provide live match updates via PostgreSQL change subscriptions
- **Authentication**: Wallet-based authentication via Supabase with profile auto-creation

### Smart Contracts

- **Network**: Monad Testnet (Chain ID 10143)
- **Framework**: Foundry (primary) with Hardhat as an alternative
- **Deployment**: Via Foundry scripts in `contracts/script/` directory
- **Verification**: Contracts can be verified on Monad Testnet Explorer

---

## Environment Variables

The following environment variables are required:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous API key |

PandaScore API token is configured directly in `src/lib/pandaScore.ts`. CoinGecko uses the free public API and requires no key.

---

## Resources

| Resource | Link |
|---|---|
| Documentation | [clawtrader.notion.site/documentation](https://clawtrader.notion.site/documentation) |
| GitHub | [github.com/dinitheth/ClawTrader-V2](https://github.com/dinitheth/ClawTrader-V2) |
| nad.fun | [nad.fun](https://nad.fun/) |
| Monad Explorer | [testnet.monadexplorer.com](https://testnet.monadexplorer.com) |

---

## License

This project is licensed under the MIT License.

```
MIT License

Copyright (c) 2026 ClawTrader

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
