import { expect } from "chai";
import { network } from "hardhat";
import type { ArcAgentEscrow } from "../types/ethers-contracts/ArcAgentEscrow.js";

const { ethers, networkHelpers } = await network.create();
const { time } = networkHelpers;

async function deployFixture() {
  const [payer, agent, arbiter, other] = await ethers.getSigners();
  const escrow = (await ethers.deployContract("ArcAgentEscrow")) as unknown as ArcAgentEscrow;
  await escrow.waitForDeployment();
  return { escrow, payer, agent, arbiter, other };
}

describe("ArcAgentEscrow", function () {
  it("creates a funded job with payer, agent, arbiter, and metadata", async function () {
    const { escrow, payer, agent, arbiter } = await deployFixture();
    const amount = ethers.parseEther("1");
    const deadline = (await time.latest()) + 3600;

    await expect(
      escrow.connect(payer).createJob(agent.address, arbiter.address, "ipfs://job", deadline, { value: amount })
    )
      .to.emit(escrow, "JobCreated")
      .withArgs(1, payer.address, agent.address, arbiter.address, amount, "ipfs://job", deadline);

    const job = await escrow.getJob(1);
    expect(job.payer).to.equal(payer.address);
    expect(job.agent).to.equal(agent.address);
    expect(job.arbiter).to.equal(arbiter.address);
    expect(job.amount).to.equal(amount);
    expect(job.status).to.equal(1);
    expect(job.metadataURI).to.equal("ipfs://job");
  });

  it("lets the agent submit a deliverable and the payer release funds", async function () {
    const { escrow, payer, agent, arbiter } = await deployFixture();
    const amount = ethers.parseEther("2.5");
    const deadline = (await time.latest()) + 3600;

    await escrow.connect(payer).createJob(agent.address, arbiter.address, "ipfs://job", deadline, { value: amount });

    await expect(escrow.connect(agent).submitDeliverable(1, "ipfs://deliverable"))
      .to.emit(escrow, "DeliverableSubmitted")
      .withArgs(1, agent.address, "ipfs://deliverable");

    await expect(escrow.connect(payer).approveJob(1)).to.changeEtherBalances(
      ethers,
      [escrow, agent],
      [-amount, amount]
    );

    const job = await escrow.getJob(1);
    expect(job.status).to.equal(4);
    expect(job.amount).to.equal(0);
    expect(job.deliverableURI).to.equal("ipfs://deliverable");
  });

  it("rejects deliverables from anyone other than the agent", async function () {
    const { escrow, payer, agent, arbiter, other } = await deployFixture();
    const deadline = (await time.latest()) + 3600;

    await escrow.connect(payer).createJob(agent.address, arbiter.address, "ipfs://job", deadline, {
      value: ethers.parseEther("1")
    });

    await expect(escrow.connect(other).submitDeliverable(1, "ipfs://fake")).to.be.revertedWithCustomError(
      escrow,
      "Unauthorized"
    );
  });

  it("refunds a payer when an unsubmitted job expires", async function () {
    const { escrow, payer, agent, arbiter } = await deployFixture();
    const amount = ethers.parseEther("1.25");
    const deadline = (await time.latest()) + 60;

    await escrow.connect(payer).createJob(agent.address, arbiter.address, "ipfs://job", deadline, { value: amount });
    await time.increaseTo(deadline + 1);

    await expect(escrow.connect(payer).refundUnsubmittedExpiredJob(1)).to.changeEtherBalances(
      ethers,
      [escrow, payer],
      [-amount, amount]
    );

    const job = await escrow.getJob(1);
    expect(job.status).to.equal(5);
    expect(job.amount).to.equal(0);
  });

  it("lets an arbiter resolve disputed funds with a split", async function () {
    const { escrow, payer, agent, arbiter } = await deployFixture();
    const amount = ethers.parseEther("10");
    const deadline = (await time.latest()) + 3600;

    await escrow.connect(payer).createJob(agent.address, arbiter.address, "ipfs://job", deadline, { value: amount });
    await escrow.connect(agent).submitDeliverable(1, "ipfs://deliverable");
    await escrow.connect(payer).disputeJob(1, "ipfs://dispute");

    const agentShare = (amount * 7000n) / 10000n;
    const payerShare = amount - agentShare;

    await expect(escrow.connect(arbiter).resolveDispute(1, 7000, "ipfs://resolution")).to.changeEtherBalances(
      ethers,
      [escrow, agent, payer],
      [-amount, agentShare, payerShare]
    );

    const job = await escrow.getJob(1);
    expect(job.status).to.equal(5);
    expect(job.amount).to.equal(0);
    expect(job.disputeURI).to.equal("ipfs://dispute");
    expect(job.resolutionURI).to.equal("ipfs://resolution");
  });
});
