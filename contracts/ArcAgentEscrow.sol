// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title ArcAgentEscrow
/// @notice USDC-native escrow for agent jobs on Arc. Native `msg.value` uses Arc's 18-decimal USDC precision.
contract ArcAgentEscrow {
    enum JobStatus {
        None,
        Funded,
        Submitted,
        Disputed,
        Released,
        Refunded
    }

    struct Job {
        address payer;
        address agent;
        address arbiter;
        uint256 amount;
        uint64 createdAt;
        uint64 deadline;
        JobStatus status;
        string metadataURI;
        string deliverableURI;
        string disputeURI;
        string resolutionURI;
    }

    error ZeroAddress();
    error ZeroAmount();
    error InvalidDeadline();
    error InvalidJob();
    error InvalidStatus(JobStatus status);
    error Unauthorized();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error InvalidSplit();
    error NativeTransferFailed();
    error Reentrancy();

    event JobCreated(
        uint256 indexed jobId,
        address indexed payer,
        address indexed agent,
        address arbiter,
        uint256 amount,
        string metadataURI,
        uint64 deadline
    );
    event DeliverableSubmitted(uint256 indexed jobId, address indexed agent, string deliverableURI);
    event JobDisputed(uint256 indexed jobId, address indexed caller, string disputeURI);
    event JobApproved(uint256 indexed jobId, address indexed payer, address indexed agent, uint256 amount);
    event JobRefunded(uint256 indexed jobId, address indexed payer, uint256 amount);
    event DisputeResolved(
        uint256 indexed jobId,
        address indexed arbiter,
        uint256 agentAmount,
        uint256 payerAmount,
        string resolutionURI
    );

    uint256 public nextJobId = 1;

    mapping(uint256 => Job) private jobs;
    bool private locked;

    modifier nonReentrant() {
        if (locked) revert Reentrancy();
        locked = true;
        _;
        locked = false;
    }

    modifier onlyPayer(uint256 jobId) {
        if (msg.sender != jobs[jobId].payer) revert Unauthorized();
        _;
    }

    modifier onlyAgent(uint256 jobId) {
        if (msg.sender != jobs[jobId].agent) revert Unauthorized();
        _;
    }

    modifier onlyParticipant(uint256 jobId) {
        Job storage job = jobs[jobId];
        if (msg.sender != job.payer && msg.sender != job.agent) revert Unauthorized();
        _;
    }

    modifier onlyArbiter(uint256 jobId) {
        if (msg.sender != jobs[jobId].arbiter) revert Unauthorized();
        _;
    }

    function createJob(
        address agent,
        address arbiter,
        string calldata metadataURI,
        uint64 deadline
    ) external payable returns (uint256 jobId) {
        if (agent == address(0) || arbiter == address(0)) revert ZeroAddress();
        if (msg.value == 0) revert ZeroAmount();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        jobId = nextJobId++;
        jobs[jobId] = Job({
            payer: msg.sender,
            agent: agent,
            arbiter: arbiter,
            amount: msg.value,
            createdAt: uint64(block.timestamp),
            deadline: deadline,
            status: JobStatus.Funded,
            metadataURI: metadataURI,
            deliverableURI: "",
            disputeURI: "",
            resolutionURI: ""
        });

        emit JobCreated(jobId, msg.sender, agent, arbiter, msg.value, metadataURI, deadline);
    }

    function submitDeliverable(uint256 jobId, string calldata deliverableURI) external onlyAgent(jobId) {
        Job storage job = _existingJob(jobId);
        if (job.status != JobStatus.Funded) revert InvalidStatus(job.status);
        if (block.timestamp > job.deadline) revert DeadlinePassed();

        job.status = JobStatus.Submitted;
        job.deliverableURI = deliverableURI;

        emit DeliverableSubmitted(jobId, msg.sender, deliverableURI);
    }

    function approveJob(uint256 jobId) external nonReentrant onlyPayer(jobId) {
        Job storage job = _existingJob(jobId);
        if (job.status != JobStatus.Submitted) revert InvalidStatus(job.status);

        uint256 amount = job.amount;
        address agent = job.agent;
        job.status = JobStatus.Released;
        job.amount = 0;

        _sendNativeUsdc(agent, amount);

        emit JobApproved(jobId, msg.sender, agent, amount);
    }

    function disputeJob(uint256 jobId, string calldata disputeURI) external onlyParticipant(jobId) {
        Job storage job = _existingJob(jobId);
        if (job.status != JobStatus.Funded && job.status != JobStatus.Submitted) {
            revert InvalidStatus(job.status);
        }

        job.status = JobStatus.Disputed;
        job.disputeURI = disputeURI;

        emit JobDisputed(jobId, msg.sender, disputeURI);
    }

    function resolveDispute(
        uint256 jobId,
        uint16 agentBps,
        string calldata resolutionURI
    ) external nonReentrant onlyArbiter(jobId) {
        Job storage job = _existingJob(jobId);
        if (job.status != JobStatus.Disputed) revert InvalidStatus(job.status);
        if (agentBps > 10_000) revert InvalidSplit();

        uint256 amount = job.amount;
        uint256 agentAmount = (amount * agentBps) / 10_000;
        uint256 payerAmount = amount - agentAmount;
        address agent = job.agent;
        address payer = job.payer;

        job.status = agentAmount == amount ? JobStatus.Released : JobStatus.Refunded;
        job.amount = 0;
        job.resolutionURI = resolutionURI;

        if (agentAmount > 0) _sendNativeUsdc(agent, agentAmount);
        if (payerAmount > 0) _sendNativeUsdc(payer, payerAmount);

        emit DisputeResolved(jobId, msg.sender, agentAmount, payerAmount, resolutionURI);
    }

    function refundUnsubmittedExpiredJob(uint256 jobId) external nonReentrant onlyPayer(jobId) {
        Job storage job = _existingJob(jobId);
        if (job.status != JobStatus.Funded) revert InvalidStatus(job.status);
        if (block.timestamp <= job.deadline) revert DeadlineNotPassed();

        uint256 amount = job.amount;
        job.status = JobStatus.Refunded;
        job.amount = 0;

        _sendNativeUsdc(job.payer, amount);

        emit JobRefunded(jobId, msg.sender, amount);
    }

    function getJob(uint256 jobId) external view returns (Job memory) {
        return _existingJob(jobId);
    }

    function _existingJob(uint256 jobId) private view returns (Job storage job) {
        job = jobs[jobId];
        if (job.status == JobStatus.None) revert InvalidJob();
    }

    function _sendNativeUsdc(address to, uint256 amount) private {
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert NativeTransferFailed();
    }
}

