import { network } from "hardhat";
import { ARC_TESTNET, MIN_MAX_FEE_PER_GAS, DEFAULT_PRIORITY_FEE_PER_GAS, parseNativeUsdc } from "../src/arc.js";

const { ethers } = await network.create();

const ESCROW_ABI = [
  "function createJob(address agent,address arbiter,string metadataURI,uint64 deadline) payable returns (uint256)",
  "event JobCreated(uint256 indexed jobId,address indexed payer,address indexed agent,address arbiter,uint256 amount,string metadataURI,uint64 deadline)"
];
const iface = new ethers.Interface(ESCROW_ABI);

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const escrowAddress = requiredEnv("ESCROW_ADDRESS");
  const agentAddress = requiredEnv("AGENT_ADDRESS");
  const arbiterAddress = requiredEnv("ARBITER_ADDRESS");
  const metadataURI = process.env.JOB_METADATA_URI || "ipfs://bafkreiexamplejobspec";
  const amount = parseNativeUsdc(process.env.JOB_AMOUNT_NATIVE_USDC || "1");
  const deadlineSeconds = BigInt(process.env.JOB_DEADLINE_SECONDS || "86400");

  const latestBlock = await ethers.provider.getBlock("latest");
  if (!latestBlock) throw new Error("Could not fetch latest block.");

  const deadline = BigInt(latestBlock.timestamp) + deadlineSeconds;
  const [payer] = await ethers.getSigners();
  const escrow = new ethers.Contract(escrowAddress, ESCROW_ABI, payer);

  console.log(`Creating job on ${ARC_TESTNET.name}`);
  console.log(`Payer: ${payer.address}`);
  console.log(`Agent: ${agentAddress}`);
  console.log(`Arbiter: ${arbiterAddress}`);
  console.log(`Amount: ${ethers.formatUnits(amount, ARC_TESTNET.nativeCurrency.decimals)} native USDC`);

  const tx = await escrow.createJob(agentAddress, arbiterAddress, metadataURI, deadline, {
    value: amount,
    maxFeePerGas: MIN_MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: DEFAULT_PRIORITY_FEE_PER_GAS
  });
  const receipt = await tx.wait();
  let created: ReturnType<typeof iface.parseLog> | null = null;
  for (const receiptLog of receipt?.logs ?? []) {
    try {
      const parsed = iface.parseLog(receiptLog);
      if (parsed?.name === "JobCreated") {
        created = parsed;
        break;
      }
    } catch {
      // Ignore logs emitted by other contracts in the receipt.
    }
  }

  console.log(`Create job tx: ${receipt?.hash}`);
  if (created) console.log(`Job ID: ${created.args.jobId.toString()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
