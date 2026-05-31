import { readFile, writeFile } from "node:fs/promises";
import { network } from "hardhat";
import { ARC_TESTNET, requireArcTestnet } from "../src/arc.js";

const { ethers, networkName } = await network.create();

async function updateDeploymentLog(address: string, txHash: string | undefined, deployer: string) {
  const docsPath = new URL("../docs/deployment.md", import.meta.url);
  let content = await readFile(docsPath, "utf8");
  const date = new Date().toISOString().slice(0, 10);
  const txValue = txHash ? `[${txHash}](${ARC_TESTNET.explorerUrl}/tx/${txHash})` : "not available";

  content = content
    .replace(/- Address:.*/m, `- Address: \`${address}\``)
    .replace(/- Deploy transaction:.*/m, `- Deploy transaction: ${txValue}`)
    .replace(/- Deployer:.*/m, `- Deployer: \`${deployer}\``)
    .replace(/- Date:.*/m, `- Date: ${date}`);

  await writeFile(docsPath, content);
}

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

  if (providerNetwork.chainId === BigInt(ARC_TESTNET.chainId)) {
    await updateDeploymentLog(address, tx?.hash, deployer.address);
    console.log("Updated docs/deployment.md");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
