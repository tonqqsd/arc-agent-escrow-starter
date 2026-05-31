import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FileText,
  Gavel,
  GitBranch,
  Layers3,
  Link2,
  Loader2,
  Network,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  Wallet
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getJobs, getStatus } from "./api.js";
import {
  ARC_TESTNET_CHAIN_ID,
  connectWallet,
  getSignedEscrow,
  hasWallet,
  parseNativeUsdc,
  requestWalletProviders,
  type DiscoveredWallet
} from "./arcEscrow.js";
import type { ApiStatus, IndexedJob, JobStatus } from "./types.js";

const sampleJobs: IndexedJob[] = [
  {
    id: "3",
    payer: "0x91c2...A8f4",
    agent: "0x7a41...6C31",
    arbiter: "0x66b9...3a10",
    amount: "12.5000",
    amountRaw: "12500000000000000000",
    deadline: Math.floor(Date.now() / 1000) + 86400,
    metadataURI: "ipfs://job-spec-agent-indexer",
    deliverableURI: "ipfs://deliverable-indexer",
    status: "Submitted",
    txHash: "0xsample",
    updatedTxHash: "0xsample"
  },
  {
    id: "2",
    payer: "0x2f10...B221",
    agent: "0x104e...d814",
    arbiter: "0x66b9...3a10",
    amount: "4.0000",
    amountRaw: "4000000000000000000",
    deadline: Math.floor(Date.now() / 1000) + 172800,
    metadataURI: "ipfs://pay-per-inference-workflow",
    status: "Funded",
    txHash: "0xsample",
    updatedTxHash: "0xsample"
  },
  {
    id: "1",
    payer: "0xa320...9921",
    agent: "0x8df0...77b2",
    arbiter: "0x66b9...3a10",
    amount: "20.0000",
    amountRaw: "20000000000000000000",
    deadline: Math.floor(Date.now() / 1000) - 3600,
    metadataURI: "ipfs://merchant-settlement-pilot",
    status: "Released",
    txHash: "0xsample",
    updatedTxHash: "0xsample"
  }
];

const lifecycle: Array<{ title: string; detail: string; icon: typeof CircleDollarSign }> = [
  { title: "Funded", detail: "Payer locks native USDC into Arc escrow.", icon: CircleDollarSign },
  { title: "Delivered", detail: "Agent submits a URI-backed proof of work.", icon: Send },
  { title: "Approved", detail: "Payer releases the job value to the agent.", icon: CheckCircle2 },
  { title: "Disputed", detail: "Payer or agent can escalate to an arbiter.", icon: Gavel },
  { title: "Settled", detail: "Funds are released, refunded, or split.", icon: BadgeDollarSign }
];

function shortAddress(value?: string) {
  if (!value) return "Not set";
  if (value.includes("...")) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function statusClass(status: JobStatus) {
  return `status status-${status.toLowerCase()}`;
}

function dateLabel(timestamp: number) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp * 1000));
}

export function App() {
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [walletOptions, setWalletOptions] = useState<DiscoveredWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [contractAddress, setContractAddress] = useState(() => localStorage.getItem("escrowAddress") || "");
  const [fromBlock, setFromBlock] = useState(() => localStorage.getItem("fromBlock") || "");
  const [jobs, setJobs] = useState<IndexedJob[]>(sampleJobs);
  const [selectedJobId, setSelectedJobId] = useState("3");
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [createForm, setCreateForm] = useState({
    agent: "",
    arbiter: "",
    amount: "1",
    deadlineHours: "24",
    metadataURI: "ipfs://replace-with-job-spec"
  });

  const [actionForm, setActionForm] = useState({
    deliverableURI: "ipfs://replace-with-deliverable",
    disputeURI: "ipfs://replace-with-dispute",
    resolutionURI: "ipfs://replace-with-resolution",
    agentSplitBps: "7000"
  });

  const selectedJob = jobs.find((job) => job.id === selectedJobId) || jobs[0];
  const selectedWallet = walletOptions.find((wallet) => wallet.id === selectedWalletId) || walletOptions[0];
  const walletProviderAvailable = hasWallet(selectedWallet?.provider);
  const canExecuteTransaction = Boolean(contractAddress && walletProviderAvailable);

  const metrics = useMemo(() => {
    const active = jobs.filter((job) => ["Funded", "Submitted", "Disputed"].includes(job.status));
    const locked = active.reduce((sum, job) => sum + Number(job.amount), 0);
    const pending = jobs.filter((job) => job.status === "Submitted").length;
    const settled = jobs.filter((job) => ["Released", "Refunded"].includes(job.status)).length;
    return { active: active.length, locked, pending, settled };
  }, [jobs]);

  useEffect(() => {
    return requestWalletProviders((wallets) => {
      setWalletOptions(wallets);
      setSelectedWalletId((current) => (wallets.some((wallet) => wallet.id === current) ? current : wallets[0]?.id || ""));
    });
  }, []);

  useEffect(() => {
    getStatus()
      .then((data) => {
        setStatus(data);
        if (!contractAddress && data.configuredEscrowAddress) {
          setContractAddress(data.configuredEscrowAddress);
        }
        if (!fromBlock && data.configuredFromBlock) {
          setFromBlock(data.configuredFromBlock);
        }
      })
      .catch((caught) => setStatusError(caught instanceof Error ? caught.message : "Status unavailable"));
  }, []);

  useEffect(() => {
    localStorage.setItem("escrowAddress", contractAddress);
  }, [contractAddress]);

  useEffect(() => {
    localStorage.setItem("fromBlock", fromBlock);
  }, [fromBlock]);

  async function refreshJobs() {
    if (!contractAddress) {
      setNotice("Set a deployed escrow address to read live Arc events. Showing sample jobs for now.");
      setJobs(sampleJobs);
      return;
    }
    setIsLoadingJobs(true);
    setError("");
    try {
      const data = await getJobs(contractAddress, fromBlock);
      setJobs(data.jobs.length ? data.jobs : sampleJobs);
      setFromBlock(data.fromBlock);
      setNotice(data.jobs.length ? `Loaded ${data.jobs.length} live job(s) through block ${data.toBlock}.` : "No live jobs found in the selected block window; sample jobs remain visible.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load jobs");
    } finally {
      setIsLoadingJobs(false);
    }
  }

  async function connect() {
    setError("");
    try {
      const wallet = await connectWallet(selectedWallet?.provider);
      setWalletAddress(wallet.address);
      setNotice("Wallet connected on Arc Testnet.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Wallet connection failed");
    }
  }

  async function execute(name: string, run: (contract: Awaited<ReturnType<typeof getSignedEscrow>>) => Promise<unknown>) {
    if (!contractAddress) {
      setError("Set ESCROW_ADDRESS first.");
      return;
    }
    if (!walletProviderAvailable) {
      setError("Install or enable a browser wallet before sending Arc transactions.");
      return;
    }
    setError("");
    setNotice(`${name}: waiting for wallet signature...`);
    try {
      if (!walletAddress) {
        const wallet = await connectWallet(selectedWallet?.provider);
        setWalletAddress(wallet.address);
      }
      const contract = await getSignedEscrow(contractAddress, selectedWallet?.provider);
      const tx = (await run(contract)) as { wait: () => Promise<{ hash?: string }> };
      const receipt = await tx.wait();
      setNotice(`${name} confirmed${receipt.hash ? `: ${receipt.hash}` : "."}`);
      await refreshJobs();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `${name} failed`);
    }
  }

  async function createJob() {
    const deadline = Math.floor(Date.now() / 1000) + Number(createForm.deadlineHours) * 3600;
    await execute("Create job", (contract) =>
      contract.createJob(createForm.agent, createForm.arbiter, createForm.metadataURI, deadline, {
        value: parseNativeUsdc(createForm.amount)
      })
    );
  }

  const jobId = selectedJob?.id || "1";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Bot size={22} />
          </div>
          <div>
            <strong>Arc Agent Escrow</strong>
            <span>Stablecoin Commerce Stack</span>
          </div>
        </div>
        <nav>
          {[
            ["Dashboard", Layers3],
            ["Create Job", CircleDollarSign],
            ["Jobs", FileText],
            ["Settlement", Gavel],
            ["Architecture", GitBranch]
          ].map(([label, Icon]) => (
            <a className={label === "Dashboard" ? "active" : ""} href={`#${label.toString().toLowerCase().replace(" ", "-")}`} key={label.toString()}>
              <Icon size={17} />
              {label.toString()}
            </a>
          ))}
        </nav>
        <div className="sponsor-box">
          <ShieldCheck size={18} />
          <strong>Challenge fit</strong>
          <span>Agentic Economy track, with SME escrow overlap.</span>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <h1>USDC escrow for autonomous agent work</h1>
            <p>Fund, verify, dispute, and settle agent jobs on Arc Testnet.</p>
          </div>
          <div className="top-actions">
            <div className="network-pill">
              <Network size={16} />
              {status ? `${status.network} · ${status.chainId} · #${status.blockNumber}` : statusError || "Checking Arc..."}
            </div>
            {walletOptions.length > 1 && (
              <label className="wallet-menu">
                Wallet
                <select value={selectedWallet?.id || ""} onChange={(event) => setSelectedWalletId(event.target.value)}>
                  {walletOptions.map((wallet) => (
                    <option value={wallet.id} key={wallet.id}>
                      {wallet.info.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {walletOptions.length === 1 && (
              <div className="wallet-pill">
                <Wallet size={16} />
                {walletOptions[0].info.name}
              </div>
            )}
            <button className="button secondary" onClick={connect} disabled={!walletProviderAvailable} title={`Expected Arc chain ID ${ARC_TESTNET_CHAIN_ID}`}>
              <Wallet size={16} />
              {walletAddress ? shortAddress(walletAddress) : walletProviderAvailable ? "Connect wallet" : "No wallet"}
            </button>
          </div>
        </header>

        <section className="config-row">
          <label>
            Escrow contract
            <input value={contractAddress} onChange={(event) => setContractAddress(event.target.value)} placeholder="0x deployed ArcAgentEscrow address" />
          </label>
          <label>
            From block
            <input value={fromBlock} onChange={(event) => setFromBlock(event.target.value)} placeholder="Optional; API clips large ranges" />
          </label>
          <button className="button" onClick={refreshJobs} disabled={isLoadingJobs}>
            {isLoadingJobs ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
            Refresh jobs
          </button>
        </section>

        {(notice || error) && (
          <section className={error ? "banner error" : "banner"}>
            {error ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span>{error || notice}</span>
          </section>
        )}

        <section className="metrics-grid">
          <Metric icon={CircleDollarSign} label="Native USDC locked" value={`${metrics.locked.toFixed(2)} USDC`} />
          <Metric icon={Bot} label="Active jobs" value={String(metrics.active)} />
          <Metric icon={Clock3} label="Pending approvals" value={String(metrics.pending)} />
          <Metric icon={BadgeDollarSign} label="Settled payouts" value={String(metrics.settled)} />
        </section>

        <section className="primary-grid">
          <div className="panel" id="create-job">
            <div className="panel-heading">
              <div>
                <h2>Create Agent Job</h2>
                <p>Locks Arc native USDC in escrow until delivery or arbitration.</p>
              </div>
              <CircleDollarSign size={22} />
            </div>
            <div className="form-grid">
              <Input label="Agent address" value={createForm.agent} onChange={(agent) => setCreateForm({ ...createForm, agent })} />
              <Input label="Arbiter address" value={createForm.arbiter} onChange={(arbiter) => setCreateForm({ ...createForm, arbiter })} />
              <Input label="Amount, native USDC" value={createForm.amount} onChange={(amount) => setCreateForm({ ...createForm, amount })} />
              <Input label="Deadline, hours" value={createForm.deadlineHours} onChange={(deadlineHours) => setCreateForm({ ...createForm, deadlineHours })} />
              <label className="full">
                Metadata URI
                <input value={createForm.metadataURI} onChange={(event) => setCreateForm({ ...createForm, metadataURI: event.target.value })} />
              </label>
            </div>
            <button className="button wide" onClick={createJob} disabled={!canExecuteTransaction}>
              <Play size={16} />
              Fund job on Arc
            </button>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>Job Lifecycle</h2>
                <p>One contract path covers happy-path settlement and dispute fallback.</p>
              </div>
              <GitBranch size={22} />
            </div>
            <div className="timeline">
              {lifecycle.map((item, index) => (
                <div className="timeline-row" key={item.title}>
                  <div className="timeline-icon">
                    <item.icon size={17} />
                  </div>
                  <div>
                    <strong>{index + 1}. {item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel jobs-panel" id="jobs">
            <div className="panel-heading">
              <div>
                <h2>Jobs</h2>
                <p>Live Arc events when a contract is configured; sample data otherwise.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Status</th>
                    <th>Agent</th>
                    <th>Amount</th>
                    <th>Deadline</th>
                    <th>Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr className={job.id === selectedJobId ? "selected" : ""} key={job.id} onClick={() => setSelectedJobId(job.id)}>
                      <td>#{job.id}</td>
                      <td><span className={statusClass(job.status)}>{job.status}</span></td>
                      <td>{shortAddress(job.agent)}</td>
                      <td>{Number(job.amount).toFixed(2)} USDC</td>
                      <td>{dateLabel(job.deadline)}</td>
                      <td>
                        {job.updatedTxHash === "0xsample" ? (
                          <span className="sample-label">sample</span>
                        ) : (
                          <a href={status ? `${status.explorerUrl}/tx/${job.updatedTxHash}` : "#"} target="_blank" rel="noreferrer">
                            tx <ExternalLink size={13} />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="panel action-panel" id="settlement">
            <div className="panel-heading">
              <div>
                <h2>Execute</h2>
                <p>Selected job #{jobId}</p>
              </div>
              <ArrowRight size={22} />
            </div>
            <Input label="Deliverable URI" value={actionForm.deliverableURI} onChange={(deliverableURI) => setActionForm({ ...actionForm, deliverableURI })} />
            <button className="button secondary wide" onClick={() => execute("Submit deliverable", (contract) => contract.submitDeliverable(jobId, actionForm.deliverableURI))} disabled={!canExecuteTransaction}>
              <Send size={16} />
              Submit deliverable
            </button>
            <button className="button wide" onClick={() => execute("Approve job", (contract) => contract.approveJob(jobId))} disabled={!canExecuteTransaction}>
              <CheckCircle2 size={16} />
              Approve payout
            </button>
            <Input label="Dispute URI" value={actionForm.disputeURI} onChange={(disputeURI) => setActionForm({ ...actionForm, disputeURI })} />
            <button className="button secondary wide" onClick={() => execute("Dispute job", (contract) => contract.disputeJob(jobId, actionForm.disputeURI))} disabled={!canExecuteTransaction}>
              <Gavel size={16} />
              Open dispute
            </button>
            <Input label="Resolution URI" value={actionForm.resolutionURI} onChange={(resolutionURI) => setActionForm({ ...actionForm, resolutionURI })} />
            <Input label="Agent split bps" value={actionForm.agentSplitBps} onChange={(agentSplitBps) => setActionForm({ ...actionForm, agentSplitBps })} />
            <button className="button secondary wide" onClick={() => execute("Resolve dispute", (contract) => contract.resolveDispute(jobId, Number(actionForm.agentSplitBps), actionForm.resolutionURI))} disabled={!canExecuteTransaction}>
              <ShieldCheck size={16} />
              Resolve split
            </button>
            <button className="button danger wide" onClick={() => execute("Refund expired job", (contract) => contract.refundUnsubmittedExpiredJob(jobId))} disabled={!canExecuteTransaction}>
              <AlertTriangle size={16} />
              Refund expired
            </button>
          </aside>
        </section>

        <section className="panel product-panel" id="architecture">
          <div className="panel-heading">
            <div>
              <h2>Circle Products Used on Arc</h2>
              <p>Submission-ready product mapping and extension path.</p>
            </div>
            <Link2 size={22} />
          </div>
          <div className="product-grid">
            <Product title="USDC on Arc" detail="Native USDC funds escrow, payouts, refunds, and split settlements." />
            <Product title="Arc smart contracts" detail="Deterministic onchain job state for agent commerce workflows." />
            <Product title="Circle Wallets ready" detail="Frontend wallet boundary can be swapped for developer-controlled wallets." />
            <Product title="Nanopayments ready" detail="Escrow model can evolve into pay-per-inference or usage-metered settlement." />
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric(props: { icon: typeof CircleDollarSign; label: string; value: string }) {
  return (
    <div className="metric">
      <props.icon size={22} />
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function Input(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      {props.label}
      <input value={props.value} onChange={(event) => props.onChange(event.target.value)} />
    </label>
  );
}

function Product(props: { title: string; detail: string }) {
  return (
    <div className="product">
      <strong>{props.title}</strong>
      <span>{props.detail}</span>
    </div>
  );
}
