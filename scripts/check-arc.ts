import "dotenv/config";
import { ethers } from "ethers";
import {
  ARC_TESTNET,
  ARC_USDC_ERC20,
  ERC20_BALANCE_ABI,
  formatErc20Usdc,
  formatNativeUsdc,
  requireArcTestnet
} from "../src/arc.js";

async function main() {
  const rpcUrl = process.env.ARC_TESTNET_RPC_URL || ARC_TESTNET.rpcUrl;
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const [network, blockNumber, gasPrice] = await Promise.all([
    provider.getNetwork(),
    provider.getBlockNumber(),
    provider.getFeeData().then((fees) => fees.gasPrice ?? 0n)
  ]);

  requireArcTestnet(network.chainId);

  console.log(`Network: ${ARC_TESTNET.name}`);
  console.log(`Chain ID: ${network.chainId.toString()}`);
  console.log(`Block: ${blockNumber}`);
  console.log(`Gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
  console.log(`Explorer: ${ARC_TESTNET.explorerUrl}`);
  console.log(`Faucet: ${ARC_TESTNET.faucetUrl}`);

  if (!process.env.PRIVATE_KEY) {
    console.log("Wallet: skipped; set PRIVATE_KEY in .env to check balances.");
    return;
  }

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const erc20 = new ethers.Contract(ARC_USDC_ERC20.address, ERC20_BALANCE_ABI, provider);
  const [nativeBalance, erc20Balance, symbol, decimals] = await Promise.all([
    provider.getBalance(wallet.address),
    erc20.balanceOf(wallet.address) as Promise<bigint>,
    erc20.symbol() as Promise<string>,
    erc20.decimals() as Promise<bigint | number>
  ]);

  console.log(`Wallet: ${wallet.address}`);
  console.log(`Native USDC balance (18 decimals): ${formatNativeUsdc(nativeBalance)}`);
  console.log(`ERC-20 ${symbol} balance (${decimals.toString()} decimals): ${formatErc20Usdc(erc20Balance)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
