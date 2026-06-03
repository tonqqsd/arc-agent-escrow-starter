import "dotenv/config";
import cors from "cors";
import express from "express";
import { ethers } from "ethers";
import { ARC_TESTNET, formatNativeUsdc, requireArcTestnet } from "../src/arc.js";

const PORT = Number(process.env.API_PORT || 8787);
const MAX_BLOCK_RANGE = 9_000n;
const BLOCK_WINDOW_OVERLAP = 500n;
const MAX_LOG_WINDOWS = 60n;
const MAX_SCAN_RANGE = MAX_BLOCK_RANGE * MAX_LOG_WINDOWS;

const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL || ARC_TESTNET.rpcUrl);

const escrowAbi = [
  "event JobCreated(uint256 indexed jobId,address indexed payer,address indexed agent,address arbiter,uint256 amount,string metadataURI,uint64 deadline)",
  "event DeliverableSubmitted(uint256 indexed jobId,address indexed agent,string deliverableURI)",
  "event JobDisputed(uint256 indexed jobId,address indexed caller,string disputeURI)",
  "event JobApproved(uint256 indexed jobId,address indexed payer,address indexed agent,uint256 amount)",
  "event JobRefunded(uint256 indexed jobId,address indexed payer,uint256 amount)",
  "event DisputeResolved(uint256 indexed jobId,address indexed arbiter,uint256 agentAmount,uint256 payerAmount,string resolutionURI)"
] as const;

const iface = new ethers.Interface(escrowAbi);
const escrowEventNames = [
  "JobCreated",
  "DeliverableSubmitted",
  "JobDisputed",
  "JobApproved",
  "JobRefunded",
  "DisputeResolved"
] as const;
const escrowEventTopics = escrowEventNames.map((eventName) => iface.getEvent(eventName)!.topicHash);

type ApiError = Error & { statusCode?: number };

type IndexedJob = {
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
  status: "Funded" | "Submitted" | "Disputed" | "Released" | "Refunded";
  txHash: string;
  updatedTxHash: string;
};

function normalizeAddress(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    return ethers.getAddress(value);
  } catch {
    return null;
  }
}

async function getSafeBlockWindow(fromBlockParam: unknown) {
  const latest = BigInt(await provider.getBlockNumber());
  let requested = latest - 25_000n;
  const configuredFromBlock = process.env.ESCROW_FROM_BLOCK;
  const requestedFromBlock =
    typeof fromBlockParam === "string" && fromBlockParam.trim() !== "" ? fromBlockParam : configuredFromBlock;

  if (requestedFromBlock && requestedFromBlock.trim() !== "") {
    if (!/^\d+$/.test(requestedFromBlock.trim())) {
      const error: ApiError = new Error("From block must be a non-negative integer.");
      error.statusCode = 400;
      throw error;
    }
    requested = BigInt(requestedFromBlock.trim());
  }

  let fromBlock = requested < 0n ? 0n : requested > latest ? latest : requested;
  let clipped = false;
  if (latest - fromBlock > MAX_SCAN_RANGE) {
    fromBlock = latest - MAX_SCAN_RANGE;
    clipped = true;
  }
  return { fromBlock, latest, clipped };
}

async function getPagedLogs(address: string, fromBlock: bigint, toBlock: bigint) {
  const logs: ethers.Log[] = [];
  const seenLogs = new Set<string>();
  let cursor = fromBlock;

  while (cursor <= toBlock) {
    const queryFromBlock = cursor > BLOCK_WINDOW_OVERLAP ? cursor - BLOCK_WINDOW_OVERLAP : 0n;
    const windowEnd = cursor + MAX_BLOCK_RANGE - 1n;
    const currentToBlock = windowEnd > toBlock ? toBlock : windowEnd;
    const windowLogs = await provider.getLogs({
      address,
      topics: [escrowEventTopics],
      fromBlock: queryFromBlock,
      toBlock: currentToBlock
    });
    for (const log of windowLogs) {
      const logKey = `${log.transactionHash}:${log.index}`;
      if (seenLogs.has(logKey)) continue;
      seenLogs.add(logKey);
      logs.push(log);
    }
    cursor = currentToBlock + 1n;
  }

  return logs;
}

async function fetchJobs(address: string, fromBlockParam: unknown) {
  const { fromBlock, latest, clipped } = await getSafeBlockWindow(fromBlockParam);
  const logs = await getPagedLogs(address, fromBlock, latest);

  const jobs = new Map<string, IndexedJob>();
  const pendingUpdates = new Map<string, Array<(job: IndexedJob) => void>>();
  const sortedLogs = [...logs].sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
    return a.index - b.index;
  });

  function applyOrQueue(jobId: string, update: (job: IndexedJob) => void) {
    const job = jobs.get(jobId);
    if (job) {
      update(job);
      return;
    }
    const updates = pendingUpdates.get(jobId) || [];
    updates.push(update);
    pendingUpdates.set(jobId, updates);
  }

  for (const log of sortedLogs) {
    const parsed = iface.parseLog(log);
    if (!parsed) continue;

    const jobId = parsed.args.jobId?.toString();
    if (!jobId) continue;

    if (parsed.name === "JobCreated") {
      jobs.set(jobId, {
        id: jobId,
        payer: parsed.args.payer,
        agent: parsed.args.agent,
        arbiter: parsed.args.arbiter,
        amount: formatNativeUsdc(parsed.args.amount),
        amountRaw: parsed.args.amount.toString(),
        deadline: Number(parsed.args.deadline),
        metadataURI: parsed.args.metadataURI,
        status: "Funded",
        txHash: log.transactionHash,
        updatedTxHash: log.transactionHash
      });
      const queuedUpdates = pendingUpdates.get(jobId) || [];
      for (const update of queuedUpdates) update(jobs.get(jobId)!);
      pendingUpdates.delete(jobId);
      continue;
    }

    if (parsed.name === "DeliverableSubmitted") {
      applyOrQueue(jobId, (job) => {
        job.status = "Submitted";
        job.deliverableURI = parsed.args.deliverableURI;
        job.updatedTxHash = log.transactionHash;
      });
      continue;
    }

    if (parsed.name === "JobDisputed") {
      applyOrQueue(jobId, (job) => {
        job.status = "Disputed";
        job.disputeURI = parsed.args.disputeURI;
        job.updatedTxHash = log.transactionHash;
      });
      continue;
    }

    if (parsed.name === "JobApproved") {
      applyOrQueue(jobId, (job) => {
        job.status = "Released";
        job.updatedTxHash = log.transactionHash;
      });
      continue;
    }

    if (parsed.name === "JobRefunded") {
      applyOrQueue(jobId, (job) => {
        job.status = "Refunded";
        job.updatedTxHash = log.transactionHash;
      });
      continue;
    }

    if (parsed.name === "DisputeResolved") {
      applyOrQueue(jobId, (job) => {
        job.status = parsed.args.payerAmount > 0n ? "Refunded" : "Released";
        job.resolutionURI = parsed.args.resolutionURI;
        job.updatedTxHash = log.transactionHash;
      });
    }
  }

  return {
    fromBlock: fromBlock.toString(),
    toBlock: latest.toString(),
    clipped,
    jobs: [...jobs.values()].sort((a, b) => Number(b.id) - Number(a.id))
  };
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/status", async (_req, res, next) => {
  try {
    const [network, blockNumber, feeData] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber(),
      provider.getFeeData()
    ]);
    requireArcTestnet(network.chainId);
    res.json({
      network: ARC_TESTNET.name,
      chainId: network.chainId.toString(),
      blockNumber,
      gasPriceGwei: ethers.formatUnits(feeData.gasPrice ?? 0n, "gwei"),
      explorerUrl: ARC_TESTNET.explorerUrl,
      faucetUrl: ARC_TESTNET.faucetUrl,
      configuredEscrowAddress: process.env.ESCROW_ADDRESS || "",
      configuredFromBlock: process.env.ESCROW_FROM_BLOCK || ""
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/jobs", async (req, res, next) => {
  try {
    const address = normalizeAddress(req.query.address || process.env.ESCROW_ADDRESS);
    if (!address) {
      res.status(400).json({ error: "A valid escrow contract address is required." });
      return;
    }
    res.json(await fetchJobs(address, req.query.fromBlock));
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const apiError = error as ApiError;
  const message = error instanceof Error ? error.message : "Unknown API error";
  res.status(apiError.statusCode || 500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Arc Agent Escrow API listening on http://localhost:${PORT}`);
});
