import { BrowserProvider, Contract, ethers } from "ethers";

export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_TESTNET_CHAIN_ID_HEX = `0x${ARC_TESTNET_CHAIN_ID.toString(16)}`;
export const ARC_TESTNET_PARAMS = {
  chainId: ARC_TESTNET_CHAIN_ID_HEX,
  chainName: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6
  },
  rpcUrls: ["https://rpc.testnet.arc.network"],
  blockExplorerUrls: ["https://testnet.arcscan.app"]
};

export const escrowAbi = [
  "function createJob(address agent,address arbiter,string metadataURI,uint64 deadline) payable returns (uint256)",
  "function submitDeliverable(uint256 jobId,string deliverableURI)",
  "function approveJob(uint256 jobId)",
  "function disputeJob(uint256 jobId,string disputeURI)",
  "function resolveDispute(uint256 jobId,uint16 agentBps,string resolutionURI)",
  "function refundUnsubmittedExpiredJob(uint256 jobId)"
] as const;

export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
  isOKExWallet?: boolean;
  selectedAddress?: string;
  providers?: EthereumProvider[];
};

export type WalletProviderInfo = {
  uuid?: string;
  name: string;
  icon?: string;
  rdns?: string;
};

export type DiscoveredWallet = {
  id: string;
  info: WalletProviderInfo;
  provider: EthereumProvider;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }

  interface WindowEventMap {
    "eip6963:announceProvider": CustomEvent<{
      info: WalletProviderInfo;
      provider: EthereumProvider;
    }>;
  }
}

function walletName(provider: EthereumProvider) {
  if (provider.isOkxWallet || provider.isOKExWallet) return "OKX Wallet";
  if (provider.isMetaMask) return "MetaMask";
  return "Injected wallet";
}

function walletId(info: WalletProviderInfo, index: number) {
  return info.uuid || info.rdns || `${info.name}-${index}`;
}

export function requestWalletProviders(onChange: (wallets: DiscoveredWallet[]) => void) {
  if (typeof window === "undefined") return () => undefined;

  const seenProviders = new Set<EthereumProvider>();
  const wallets = new Map<string, DiscoveredWallet>();

  function addWallet(info: WalletProviderInfo, provider: EthereumProvider) {
    if (seenProviders.has(provider)) return;
    seenProviders.add(provider);
    const id = walletId(info, wallets.size);
    wallets.set(id, { id, info, provider });
    onChange([...wallets.values()]);
  }

  function handleAnnouncement(event: WindowEventMap["eip6963:announceProvider"]) {
    if (!event.detail?.provider || !event.detail.info?.name) return;
    addWallet(event.detail.info, event.detail.provider);
  }

  window.addEventListener("eip6963:announceProvider", handleAnnouncement);
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  if (window.ethereum) {
    const injectedProviders = window.ethereum.providers?.length ? window.ethereum.providers : [window.ethereum];
    for (const provider of injectedProviders) {
      addWallet({ name: walletName(provider) }, provider);
    }
  }

  return () => window.removeEventListener("eip6963:announceProvider", handleAnnouncement);
}

export function hasWallet(provider?: EthereumProvider) {
  return Boolean(provider) || (typeof window !== "undefined" && Boolean(window.ethereum));
}

function requireProvider(provider?: EthereumProvider) {
  const selectedProvider = provider || (typeof window !== "undefined" ? window.ethereum : undefined);
  if (!selectedProvider) throw new Error("Install or enable an EIP-1193 browser wallet to execute transactions.");
  return selectedProvider;
}

function readAccounts(value: unknown) {
  return Array.isArray(value) ? value.filter((account): account is string => typeof account === "string") : [];
}

function readChainId(value: unknown) {
  return typeof value === "string" ? value : "";
}

async function readWalletBalance(provider: BrowserProvider, address: string) {
  const balance = await provider.getBalance(address);
  return ethers.formatUnits(balance, 18);
}

export async function switchToArcTestnet(provider?: EthereumProvider) {
  const selectedProvider = requireProvider(provider);
  try {
    await selectedProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_TESTNET_CHAIN_ID_HEX }]
    });
  } catch (error) {
    const maybeCode = error as { code?: number };
    if (maybeCode.code === 4902) {
      await selectedProvider.request({
        method: "wallet_addEthereumChain",
        params: [ARC_TESTNET_PARAMS]
      });
      return;
    }
    throw error;
  }
}

export async function connectWallet(walletProvider?: EthereumProvider) {
  const selectedProvider = requireProvider(walletProvider);
  await switchToArcTestnet(selectedProvider);
  const provider = new BrowserProvider(selectedProvider);
  const accounts = await provider.send("eth_requestAccounts", []);
  const address = accounts[0] as string;
  const chainId = readChainId(await selectedProvider.request({ method: "eth_chainId" }));
  return {
    address,
    chainId,
    balance: await readWalletBalance(provider, address),
    provider
  };
}

export async function getWalletSnapshot(walletProvider?: EthereumProvider) {
  const selectedProvider = requireProvider(walletProvider);
  const provider = new BrowserProvider(selectedProvider);
  const [accountsValue, chainIdValue] = await Promise.all([
    selectedProvider.request({ method: "eth_accounts" }),
    selectedProvider.request({ method: "eth_chainId" })
  ]);
  const address = readAccounts(accountsValue)[0] || "";
  return {
    address,
    chainId: readChainId(chainIdValue),
    balance: address ? await readWalletBalance(provider, address) : ""
  };
}

export async function disconnectWallet(walletProvider?: EthereumProvider) {
  const selectedProvider = walletProvider || (typeof window !== "undefined" ? window.ethereum : undefined);
  if (!selectedProvider) return;
  try {
    await selectedProvider.request({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }]
    });
  } catch {
    // Many wallets do not implement permission revocation. Local app state is still cleared by the caller.
  }
}

export async function getSignedEscrow(address: string, walletProvider?: EthereumProvider) {
  const selectedProvider = requireProvider(walletProvider);
  await switchToArcTestnet(selectedProvider);
  const provider = new BrowserProvider(selectedProvider);
  const signer = await provider.getSigner();
  return new Contract(address, escrowAbi, signer);
}

export function parseNativeUsdc(value: string) {
  return ethers.parseUnits(value || "0", 18);
}
