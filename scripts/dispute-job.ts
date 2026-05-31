import { network } from "hardhat";
import { DEFAULT_PRIORITY_FEE_PER_GAS, MIN_MAX_FEE_PER_GAS } from "../src/arc.js";

const { ethers } = await network.create();

const ESCROW_ABI = ["function disputeJob(uint256 jobId,string disputeURI)"];

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const escrowAddress = requiredEnv("ESCROW_ADDRESS");
  const jobId = BigInt(requiredEnv("JOB_ID"));
  const disputeURI = requiredEnv("DISPUTE_URI");
  const [participant] = await ethers.getSigners();
  const escrow = new ethers.Contract(escrowAddress, ESCROW_ABI, participant);

  const tx = await escrow.disputeJob(jobId, disputeURI, {
    maxFeePerGas: MIN_MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: DEFAULT_PRIORITY_FEE_PER_GAS
  });
  const receipt = await tx.wait();

  console.log(`Dispute job tx: ${receipt?.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

