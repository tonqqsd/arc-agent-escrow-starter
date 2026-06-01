import "dotenv/config";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const requiredEnv = ["CIRCLE_API_KEY", "CIRCLE_ENTITY_SECRET"] as const;
const missing = requiredEnv.filter((name) => !process.env[name]);
const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

console.log("Circle Developer-Controlled Wallets SDK: installed");
console.log("Target blockchain: ARC-TESTNET");

if (missing.length > 0 || !apiKey || !entitySecret) {
  console.log(`Circle API credentials: not configured (${missing.join(", ")})`);
  console.log("Add them to local .env only when you are ready to create or operate Circle-managed wallets.");
  process.exit(0);
}

initiateDeveloperControlledWalletsClient({
  apiKey,
  entitySecret
});

console.log("Circle API credentials: present");
console.log("Client initialization: ok");
