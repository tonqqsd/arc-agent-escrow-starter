import { network } from "hardhat";
import { DEFAULT_PRIORITY_FEE_PER_GAS, MIN_MAX_FEE_PER_GAS } from "../src/arc.js";

const { ethers } = await network.create();

const ESCROW_ABI = ["function submitDeliverable(uint256 jobId,string deliverableURI)"];

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const escrowAddress = requiredEnv("ESCROW_ADDRESS");
  const jobId = BigInt(requiredEnv("JOB_ID"));
  const deliverableURI = requiredEnv("DELIVERABLE_URI");
  const [agent] = await ethers.getSigners();
  const escrow = new ethers.Contract(escrowAddress, ESCROW_ABI, agent);

  const tx = await escrow.submitDeliverable(jobId, deliverableURI, {
    maxFeePerGas: MIN_MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: DEFAULT_PRIORITY_FEE_PER_GAS
  });
  const receipt = await tx.wait();

  console.log(`Submit deliverable tx: ${receipt?.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
