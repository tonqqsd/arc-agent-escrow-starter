# Ignyte Submission Draft

## Title

Arc Agent Escrow

## Short Description

Arc Agent Escrow is a USDC-native job settlement stack for autonomous AI agent work. It lets a payer fund an agent task on Arc Testnet, lets the agent submit URI-backed deliverables, and supports approval, refund, dispute, and arbiter-led split settlement.

## Track

Best Agentic Economy Experience on Arc

Secondary fit: SME Trade Finance & Working Capital Workflow, because the same escrow flow can support milestone-based trade settlement.

## Circle Products Used On Arc

- USDC
- Arc
- Circle Wallets-ready wallet boundary
- Nanopayments-ready settlement model
- CCTP / Bridge Kit as a documented extension path

## Functional MVP

The repository includes:

- `ArcAgentEscrow` Solidity contract
- Hardhat 3 deployment and lifecycle scripts
- React frontend dashboard
- Node API / event indexer
- Metadata examples for job specs and deliverables
- Architecture diagram
- Tests and type checks

## Setup

```bash
npm install
cp .env.example .env
npm test
npm run typecheck
npm run app:dev
```

For live Arc Testnet execution:

```bash
npm run check
npm run deploy:arc
```

Then set `ESCROW_ADDRESS` in `.env` and in the frontend dashboard.

## Demo Script

1. Show Arc Testnet status in the app header.
2. Connect a wallet on Arc Testnet.
3. Create a job with agent, arbiter, amount, deadline, and metadata URI.
4. Submit a deliverable URI.
5. Approve payout, or open a dispute and resolve a split.
6. Refresh indexed events and show the job state in the table.

## Circle Product Feedback

### Why These Products

USDC on Arc is the natural settlement rail for agent work because values, gas, escrow balances, and payouts are dollar-denominated. Arc smart contracts provide the programmable state machine for job funding, delivery, dispute, and settlement.

### What Worked Well

- Arc Testnet RPC and chain configuration are straightforward.
- Native USDC as gas simplifies the mental model for commerce workflows.
- Event-driven indexing is enough for a useful MVP and makes the flow auditable.

### What Could Be Improved

- More end-to-end examples combining Arc contracts, Circle Wallets, and agent-initiated transactions would shorten build time.
- A clear local sandbox for Wallets, Gateway, and Nanopayments would help hackathon teams without enterprise access.
- More sample UI patterns for non-crypto-native payment users would improve adoption.

### Recommendations

- Publish an agentic payments sample that combines Circle Wallets, Arc native USDC, and event-indexed task settlement.
- Provide a faucet-to-demo checklist for teams recording hackathon videos.
- Provide a lightweight Nanopayments simulator for testnet demos.

## Required Links Before Submission

- GitHub repository:
- Demo application URL:
- Product demo video:
- Deployed contract address:
- ArcScan deployment transaction:
- Circle Developer Account email:

