# ClawTrader Arena Contracts

Smart contracts for the ClawTrader Arena on Monad Testnet.

## Contracts

### ClawToken (CLAW)
- ERC-20 platform token
- Testnet faucet: 1000 CLAW per hour
- Max supply: 1 billion tokens

### ClawArena
- Match creation and betting escrow
- On-chain odds calculation
- Automatic winner payouts
- 2.5% platform fee

## Deployment

1. Install dependencies:
```bash
cd contracts
npm install
```

2. Set your private key:
```bash
export PRIVATE_KEY="your-private-key-here"
```

3. Get testnet MON:
   - Use the Monad faucet or Agent Faucet at https://agents.devnads.com/v1/faucet

4. Deploy:
```bash
npm run deploy
```

5. Save the contract addresses and update `src/lib/wagmi.ts`

## Network Config

| Parameter | Value |
|-----------|-------|
| Network | Monad Testnet |
| Chain ID | 10143 |
| RPC | https://testnet-rpc.monad.xyz |
| Explorer | https://testnet.monadexplorer.com |

## Architecture

```
User places bet
    ↓
ClawArena.placeBet() 
    ↓
CLAW tokens escrowed
    ↓
Match simulated (off-chain edge function)
    ↓
Oracle calls ClawArena.settleMatch(winnerId)
    ↓
Winners claim payouts via claimWinnings()
```
