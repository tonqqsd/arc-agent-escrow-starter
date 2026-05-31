# Arc Agent Escrow Starter

Open-source starter kit for building USDC-native agent jobs on Arc Testnet.

It gives the Arc ecosystem a small but useful reference implementation for an agentic economy workflow:

- a Solidity escrow contract for funding agent jobs with Arc native USDC
- payer, agent, and arbiter roles
- deliverable submission, payer approval, unsubmitted-job refund, and disputed-job resolution
- chain health and balance checks for Arc Testnet
- deployment and job lifecycle scripts
- tests that document the settlement behavior
- metadata examples for job specs and deliverables


## Why This Fits Arc

Arc is currently testnet-only and is built for stablecoin-native financial applications. The official docs highlight:

- Arc Testnet RPC: `https://rpc.testnet.arc.network`
- Chain ID: `5042002`
- native gas token: USDC
- native USDC precision: 18 decimals for gas, native sends, and `msg.value`
- ERC-20 USDC interface: `0x3600000000000000000000000000000000000000`, 6 decimals
- agentic economy use cases around identity, reputation, job settlement, and USDC escrow

Sources:

- https://docs.arc.io/build
- https://docs.arc.io/arc/references/connect-to-arc
- https://docs.arc.io/arc/concepts/stablecoin-native-model
- https://docs.arc.io/build/agentic-economy

## Install

```bash
npm install
cp .env.example .env
```

Fill `.env` locally. Do not paste private keys in chat, commit them, or pass them as plain CLI flags.

## Verify Arc Connectivity

```bash
npm run check
```

The script checks the chain ID, block number, gas price, and optional wallet balances.

## Compile And Test

```bash
npm run compile
npm test
npm run typecheck
```

## Run The MVP App

The MVP includes a frontend dashboard and a lightweight API/indexer.

```bash
npm run app:dev
```

Open `http://localhost:5173`.

The API runs on `http://localhost:8787` and exposes:

- `GET /api/status`
- `GET /api/jobs?address=<ESCROW_ADDRESS>&fromBlock=<BLOCK>`

Without a deployed contract address, the frontend shows sample jobs so the demo flow is still visible. Once `ESCROW_ADDRESS` is set, the API reads real Arc Testnet events.

## Deploy To Arc Testnet

1. Create a fresh testnet wallet.
2. Add `PRIVATE_KEY` to `.env`.
3. Request testnet USDC from the Circle Faucet: https://faucet.circle.com
4. Check the wallet:

```bash
npm run check
```

5. Deploy:

```bash
npm run deploy:arc
```

## Job Lifecycle

After deployment, set `ESCROW_ADDRESS`, `AGENT_ADDRESS`, `ARBITER_ADDRESS`, and job fields in `.env`.

Use `examples/job-spec.json` and `examples/deliverable.json` as starting points for the URI-backed metadata you publish offchain.

Create a funded job:

```bash
npm run job:create
```

Submit a deliverable as the agent wallet:

```bash
npm run job:submit
```

Approve and release funds as the payer wallet:

```bash
npm run job:approve
```

Dispute a job as the payer or agent wallet:

```bash
npm run job:dispute
```

Resolve a dispute as the arbiter wallet:

```bash
npm run job:resolve
```

Refund an unsubmitted expired job as the payer:

```bash
npm run job:refund
```

## Contribution Checklist

- Publish this repository publicly with a clear README.
- Deploy the contract on Arc Testnet.
- Save the deployment address and explorer link in `docs/deployment.md`.
- Create at least one funded job and complete the lifecycle on testnet.
- Run the MVP frontend and record a 2-3 minute demo video.
- Include the architecture diagram and Circle Product Feedback from `docs/submission.md`.
- Share the repo, deployment transaction, and short demo in Arc community channels.
- Keep improving the project with issue templates, screenshots, event indexing, and ERC-8004 / ERC-8183 integrations.

## Security Notes

This is a starter kit, not audited production code. Use it on Arc Testnet only. Do not use real funds. Review and test all changes before deploying.
