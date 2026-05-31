import { network } from "hardhat";
import { DEFAULT_PRIORITY_FEE_PER_GAS, MIN_MAX_FEE_PER_GAS } from "../src/arc.js";

const { ethers } = await network.create();

const ESCROW_ABI = ["function resolveDispute(uint256 jobId,uint16 agentBps,string resolutionURI)"];

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const escrowAddress = requiredEnv("ESCROW_ADDRESS");
  const jobId = BigInt(requiredEnv("JOB_ID"));
  const resolutionURI = requiredEnv("RESOLUTION_URI");
  const agentBps = Number(requiredEnv("AGENT_SPLIT_BPS"));

  if (!Number.isInteger(agentBps) || agentBps < 0 || agentBps > 10_000) {
    throw new Error("AGENT_SPLIT_BPS must be an integer from 0 to 10000.");
  }

  const [arbiter] = await ethers.getSigners();
  const escrow = new ethers.Contract(escrowAddress, ESCROW_ABI, arbiter);

  const tx = await escrow.resolveDispute(jobId, agentBps, resolutionURI, {
    maxFeePerGas: MIN_MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: DEFAULT_PRIORITY_FEE_PER_GAS
  });
  const receipt = await tx.wait();

  console.log(`Resolve dispute tx: ${receipt?.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

