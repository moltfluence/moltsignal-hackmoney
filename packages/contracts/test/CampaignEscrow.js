const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CampaignEscrow", function () {
  it("allows relayed join with agent signature", async function () {
    const [owner, oracle, relayer, agent] = await ethers.getSigners();

    const Escrow = await ethers.getContractFactory("CampaignEscrow");
    const escrow = await Escrow.deploy(owner.address, oracle.address);

    const endTime = Math.floor(Date.now() / 1000) + 3600;
    await escrow.connect(owner).createCampaign("join campaign", endTime, false, {
      value: ethers.parseEther("1"),
    });

    const chainId = (await ethers.provider.getNetwork()).chainId;
    const joinPrefix = ethers.keccak256(ethers.toUtf8Bytes("JOIN_CAMPAIGN"));
    const joinDigest = ethers.solidityPackedKeccak256(
      ["bytes32", "uint256", "address", "uint256", "address"],
      [joinPrefix, chainId, await escrow.getAddress(), 1n, agent.address],
    );
    const agentSig = await agent.signMessage(ethers.getBytes(joinDigest));

    await expect(escrow.connect(relayer).joinCampaignFor(1n, agent.address, agentSig)).to.not.be.reverted;
    expect(await escrow.isParticipant(1n, agent.address)).to.equal(true);
  });

  it("settles with oracle EIP-712 signature", async function () {
    const [owner, oracle, agent] = await ethers.getSigners();

    const Escrow = await ethers.getContractFactory("CampaignEscrow");
    const escrow = await Escrow.deploy(owner.address, oracle.address);

    const budget = ethers.parseEther("1");
    const endTime = Math.floor(Date.now() / 1000) + 60;
    await escrow.connect(owner).createCampaign("settle campaign", endTime, false, { value: budget });
    await escrow.connect(agent).joinCampaign(1n);

    await ethers.provider.send("evm_increaseTime", [120]);
    await ethers.provider.send("evm_mine", []);

    const proofHash = ethers.keccak256(ethers.toUtf8Bytes("proof-1"));
    const rows = [{ agent: agent.address, payoutWei: budget, adsScore: 7000, proofHash }];

    const settlementTypeHash = ethers.keccak256(
      ethers.toUtf8Bytes("Settlement(address agent,uint96 payoutWei,uint32 adsScore,bytes32 proofHash)"),
    );
    const rowHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "address", "uint96", "uint32", "bytes32"],
        [settlementTypeHash, agent.address, budget, 7000, proofHash],
      ),
    );
    const rowsHash = ethers.keccak256(ethers.concat([rowHash]));

    const domain = {
      name: "MoltSignalEscrow",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await escrow.getAddress(),
    };
    const types = {
      SettlementData: [
        { name: "campaignId", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "rowsHash", type: "bytes32" },
      ],
    };

    const sig = await oracle.signTypedData(domain, types, {
      campaignId: 1n,
      nonce: 0n,
      rowsHash,
    });

    await expect(escrow.settleCampaign(1n, rows, sig)).to.not.be.reverted;
  });
});

