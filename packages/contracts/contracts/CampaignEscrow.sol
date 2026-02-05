// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CampaignEscrow is EIP712, Ownable {
    struct Campaign {
        address sponsor;
        uint96 budgetWei;
        uint64 endTime;
        bool settled;
        uint64 nonce;
    }

    struct Settlement {
        address agent;
        uint96 payoutWei;
        uint32 adsScore;
        bytes32 proofHash;
    }

    bytes32 private constant SETTLEMENT_TYPEHASH =
        keccak256("Settlement(address agent,uint96 payoutWei,uint32 adsScore,bytes32 proofHash)");
    bytes32 private constant SETTLEMENT_DATA_TYPEHASH =
        keccak256("SettlementData(uint256 campaignId,uint256 nonce,bytes32 rowsHash)");

    bytes32 public constant JOIN_PREFIX = keccak256("JOIN_CAMPAIGN");

    uint256 public nextCampaignId = 1;
    address public oracle;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => bool)) public isParticipant;
    mapping(uint256 => mapping(address => uint96)) public pendingClaims;

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed sponsor,
        uint96 budgetWei,
        uint64 endTime,
        string objective
    );
    event AgentJoined(uint256 indexed campaignId, address indexed agent);
    event CampaignSettled(uint256 indexed campaignId, bytes32 settlementDigest, uint256 totalPayout);
    event RewardClaimed(uint256 indexed campaignId, address indexed agent, uint256 amount);
    event OracleUpdated(address indexed oracle);

    constructor(address owner_, address oracle_)
        EIP712("MoltSignalEscrow", "1")
        Ownable(owner_)
    {
        oracle = oracle_;
    }

    function setOracle(address oracle_) external onlyOwner {
        oracle = oracle_;
        emit OracleUpdated(oracle_);
    }

    function createCampaign(string calldata objective, uint64 endTime, bool /* premium */ )
        external
        payable
        returns (uint256 campaignId)
    {
        require(msg.value > 0, "budget required");
        require(endTime > block.timestamp, "endTime in past");

        campaignId = nextCampaignId++;
        campaigns[campaignId] = Campaign({
            sponsor: msg.sender,
            budgetWei: uint96(msg.value),
            endTime: endTime,
            settled: false,
            nonce: 0
        });

        emit CampaignCreated(campaignId, msg.sender, uint96(msg.value), endTime, objective);
    }

    function joinCampaign(uint256 campaignId) external {
        _join(campaignId, msg.sender);
    }

    function joinCampaignFor(uint256 campaignId, address agent, bytes calldata agentSig) external {
        bytes32 digest = _joinDigest(campaignId, agent);
        address signer = ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(digest), agentSig);
        require(signer == agent, "invalid agent sig");
        _join(campaignId, agent);
    }

    function settleCampaign(uint256 campaignId, Settlement[] calldata rows, bytes calldata oracleSig) external {
        Campaign storage c = campaigns[campaignId];
        require(c.sponsor != address(0), "campaign missing");
        require(!c.settled, "already settled");
        require(block.timestamp >= c.endTime, "campaign not ended");
        require(rows.length > 0, "rows required");

        bytes32 rowsHash = _hashSettlementRows(rows);
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(SETTLEMENT_DATA_TYPEHASH, campaignId, c.nonce, rowsHash))
        );
        address signer = ECDSA.recover(digest, oracleSig);
        require(signer == oracle, "invalid oracle sig");

        uint256 total;
        for (uint256 i = 0; i < rows.length; i++) {
            Settlement calldata row = rows[i];
            total += row.payoutWei;
            if (row.payoutWei == 0) {
                continue;
            }
            (bool ok,) = payable(row.agent).call{value: row.payoutWei}("");
            if (!ok) {
                pendingClaims[campaignId][row.agent] += row.payoutWei;
            }
        }

        require(total == c.budgetWei, "budget mismatch");
        c.settled = true;
        c.nonce += 1;

        emit CampaignSettled(campaignId, digest, total);
    }

    function claim(uint256 campaignId) external {
        uint96 amount = pendingClaims[campaignId][msg.sender];
        require(amount > 0, "nothing to claim");
        pendingClaims[campaignId][msg.sender] = 0;

        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "transfer failed");
        emit RewardClaimed(campaignId, msg.sender, amount);
    }

    function _join(uint256 campaignId, address agent) internal {
        Campaign storage c = campaigns[campaignId];
        require(c.sponsor != address(0), "campaign missing");
        require(block.timestamp < c.endTime, "campaign ended");
        require(!isParticipant[campaignId][agent], "already joined");

        isParticipant[campaignId][agent] = true;
        emit AgentJoined(campaignId, agent);
    }

    function _joinDigest(uint256 campaignId, address agent) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(JOIN_PREFIX, block.chainid, address(this), campaignId, agent));
    }

    function _hashSettlementRows(Settlement[] calldata rows) internal pure returns (bytes32) {
        bytes32[] memory hashes = new bytes32[](rows.length);
        for (uint256 i = 0; i < rows.length; i++) {
            hashes[i] = keccak256(
                abi.encode(SETTLEMENT_TYPEHASH, rows[i].agent, rows[i].payoutWei, rows[i].adsScore, rows[i].proofHash)
            );
        }
        return keccak256(abi.encodePacked(hashes));
    }
}
