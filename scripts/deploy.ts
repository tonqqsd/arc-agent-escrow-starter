import { network } from "hardhat";
import { ARC_TESTNET, requireArcTestnet } from "../src/arc.js";

const { ethers, networkName } = await network.create();

async function main() {
  const providerNetwork = await ethers.provider.getNetwork();
  if (providerNetwork.chainId !== 31337n) requireArcTestnet(providerNetwork.chainId);
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Native balance: ${ethers.formatUnits(balance, ARC_TESTNET.nativeCurrency.decimals)} USDC`);

  const Escrow = await ethers.getContractFactory("ArcAgentEscrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  const tx = escrow.deploymentTransaction();

  console.log(`ArcAgentEscrow: ${address}`);
  if (tx) console.log(`Deploy tx: ${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
