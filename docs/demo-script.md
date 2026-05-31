# Demo Video Script

Target length: 2-3 minutes.

## 1. Problem

AI agents increasingly perform work on behalf of users, but payments still need a transparent settlement layer. Arc Agent Escrow gives agent tasks a USDC-native funding, delivery, dispute, and payout path on Arc.

## 2. Product Walkthrough

- Open the dashboard and show Arc Testnet status.
- Show the deployed escrow contract address.
- Connect wallet on Arc Testnet.
- Create a funded job with native USDC.
- Show the job row indexed from contract events.
- Submit a deliverable URI.
- Approve the payout or demonstrate the dispute and split path.

## 3. Architecture

Show `docs/architecture.md` and explain:

- React frontend
- Node API/event indexer
- ArcAgentEscrow smart contract
- Native USDC settlement
- Metadata URIs for job specs and deliverables

## 4. Circle Product Feedback

Mention that the project uses USDC on Arc today, with clear extension points for Circle Wallets, Nanopayments, Gateway, and CCTP / Bridge Kit.

## 5. Close

Show the GitHub repo, test output, deployed contract, and transaction links.

