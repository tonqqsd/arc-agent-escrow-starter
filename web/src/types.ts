export type JobStatus = "Funded" | "Submitted" | "Disputed" | "Released" | "Refunded";

export type IndexedJob = {
  id: string;
  payer: string;
  agent: string;
  arbiter: string;
  amount: string;
  amountRaw: string;
  deadline: number;
  metadataURI: string;
  deliverableURI?: string;
  disputeURI?: string;
  resolutionURI?: string;
  status: JobStatus;
  txHash: string;
  updatedTxHash: string;
};

export type ApiStatus = {
  network: string;
  chainId: string;
  blockNumber: number;
  gasPriceGwei: string;
  explorerUrl: string;
  faucetUrl: string;
  configuredEscrowAddress: string;
};

