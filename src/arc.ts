import { ethers } from "ethers";

export const ARC_TESTNET = {
  name: "Arc Testnet",
  chainId: 5042002,
  rpcUrl: "https://rpc.testnet.arc.network",
  websocketUrl: "wss://rpc.testnet.arc.network",
  explorerUrl: "https://testnet.arcscan.app",
  faucetUrl: "https://faucet.circle.com",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18
  }
} as const;

export const ARC_USDC_ERC20 = {
  address: "0x3600000000000000000000000000000000000000",
  decimals: 6
} as const;

export const MIN_MAX_FEE_PER_GAS = ethers.parseUnits("30", "gwei");
export const DEFAULT_PRIORITY_FEE_PER_GAS = ethers.parseUnits("1", "gwei");

export function requireArcTestnet(chainId: bigint | number): void {
  const actual = typeof chainId === "bigint" ? Number(chainId) : chainId;
  if (actual !== ARC_TESTNET.chainId) {
    throw new Error(`Expected Arc Testnet chain ID ${ARC_TESTNET.chainId}, got ${actual}`);
  }
}

export function parseNativeUsdc(value: string): bigint {
  return ethers.parseUnits(value, ARC_TESTNET.nativeCurrency.decimals);
}

export function formatNativeUsdc(value: bigint): string {
  return ethers.formatUnits(value, ARC_TESTNET.nativeCurrency.decimals);
}

export function parseErc20Usdc(value: string): bigint {
  return ethers.parseUnits(value, ARC_USDC_ERC20.decimals);
}

export function formatErc20Usdc(value: bigint): string {
  return ethers.formatUnits(value, ARC_USDC_ERC20.decimals);
}

export const ERC20_BALANCE_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
] as const;
