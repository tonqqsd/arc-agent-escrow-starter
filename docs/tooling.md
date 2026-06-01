# Arc and Circle Tooling

This project is configured for the standard Arc and Circle developer path.

## Installed Locally

- Node.js `24.15.0`
- npm `11.12.1`
- GitHub CLI
- Foundry `forge`, `cast`, and `anvil`
- Circle CLI `circle`
- Circle Developer-Controlled Wallets Node SDK

## Arc Checks

Arc Testnet uses:

- RPC: `https://rpc.testnet.arc.network`
- Chain ID: `5042002`
- Gas token: native USDC
- Explorer: `https://testnet.arcscan.app`

Run:

```bash
npm run check
npm run arc:cast:check
npm run foundry:build
```

## Circle CLI

Circle CLI is installed globally:

```bash
circle --version
circle --help
```

Before using Circle CLI wallet, bridge, Gateway, or x402 payment commands, you must personally accept the Circle CLI terms:

```bash
circle terms show
circle terms accept
```

I did not accept terms on your behalf.

## Circle Wallets SDK

The project includes `@circle-fin/developer-controlled-wallets` for optional Arc Testnet wallet automation.

Run:

```bash
npm run circle:wallets:check
```

To use the API integration, create a Circle Developer Console API key and Entity Secret, then add them only to local `.env`:

```env
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
CIRCLE_WALLET_SET_ID=
CIRCLE_WALLET_ID=
```

Do not commit these values.

## AI Development Servers

Official docs expose MCP servers for IDEs that support MCP:

- Arc Docs MCP: `https://docs.arc.io/mcp`
- Circle MCP: `https://api.circle.com/v1/codegen/mcp`

Use them in Cursor, Claude Code, VS Code, Windsurf, or another MCP-compatible client when you want source-backed Arc/Circle code generation.
