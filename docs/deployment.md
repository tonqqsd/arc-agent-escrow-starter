# Deployment Log

Use this file to record testnet evidence after deployment.

## Arc Testnet

- Network: Arc Testnet
- Chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.network`
- Explorer: `https://testnet.arcscan.app`

## Contract

- Contract: `ArcAgentEscrow`
- Address: `0x7a8Ea241ccdf697Dfb6598B11ccD455356689a21`
- Deploy transaction: [0x8125ac35f2a2a4cf751798bb8007df40d04b7ee55ba5932f0fe44d8550c45260](https://testnet.arcscan.app/tx/0x8125ac35f2a2a4cf751798bb8007df40d04b7ee55ba5932f0fe44d8550c45260)
- Deploy block: `44926517`
- Deployer: `0x8d184c1e06676b90a3a128A6EDc6789b8fAfDd86`
- Date: 2026-06-01

## Demo Jobs

| Job ID | Metadata URI | Amount | Agent | Arbiter | Result | Transactions |
| --- | --- | ---: | --- | --- | --- | --- |
| `1` | `https://raw.githubusercontent.com/tonqqsd/arc-agent-escrow-starter/main/examples/job-spec.json` | `0.25 USDC` | `0x8d184c1e06676b90a3a128A6EDc6789b8fAfDd86` | `0x8d184c1e06676b90a3a128A6EDc6789b8fAfDd86` | Released | [create](https://testnet.arcscan.app/tx/0x8f057bbd2ceaad726729d003aa4a0094d85df063226f679447cc68dbc2ef784c), [submit](https://testnet.arcscan.app/tx/0xea6fe90d8136cf747ca651bf775e9d4f9369cf775182f08f634230f831637867), [approve](https://testnet.arcscan.app/tx/0x87d33b146006066adbfd475c46e92f049b34d1bd540ebe62afed89d02bc47666) |

## Community Post

- GitHub repo: https://github.com/tonqqsd/arc-agent-escrow-starter
- Arc community link:
- Notes: `ArcAgentEscrow` is deployed on Arc Testnet. Local `.env` has been updated with `ESCROW_ADDRESS` and `ESCROW_FROM_BLOCK` for scripts and the API.
