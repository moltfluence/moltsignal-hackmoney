// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title CampaignEscrow
/// @notice Holds USDC campaign budgets and distributes payouts based on oracle-signed settlements
/// @dev Uses ERC-20 USDC instead of native ETH for Arc/Circle prize compatibility
contract CampaignEscrow is EIP712, Ownable {
    using SafeERC20 for IERC20;

    struct Campaign {
        address sponsor;
        uint96 budgetUsdc;
        uint64 endTime;
        bool settled;
        uint64 nonce;
    }

    struct Settlement {
        address agent;
        uint96 payoutUsdc;
        uint32 adsScore;
        bytes32 proofHash;
    }

    bytes32 private constant SETTLEMENT_TYPEHASH =
        keccak256("Settlement(address agent,uint96 payoutUsdc,uint32 adsScore,bytes32 proofHash)");
    bytes32 private constant SETTLEMENT_DATA_TYPEHASH =
        keccak256("SettlementData(uint256 campaignId,uint256 nonce,bytes32 rowsHash)");

    bytes32 public constant JOIN_PREFIX = keccak256("JOIN_CAMPAIGN");

    /// @notice The USDC token contract
    IERC20 public immutable usdc;

    uint256 public nextCampaignId = 1;
    address public oracle;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => bool)) public isParticipant;
    mapping(uint256 => mapping(address => uint96)) public pendingClaims;

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed sponsor,
        uint96 budgetUsdc,
        uint64 endTime,
        string objective
    );
    event AgentJoined(uint256 indexed campaignId, address indexed agent);
    event CampaignSettled(uint256 indexed campaignId, bytes32 settlementDigest, uint256 totalPayout);
    event RewardClaimed(uint256 indexed campaignId, address indexed agent, uint256 amount);
    event OracleUpdated(address indexed oracle);

    /// @param owner_ The contract owner (can update oracle)
    /// @param oracle_ The oracle address that signs settlements
    /// @param usdc_ The USDC token address on this chain
    constructor(address owner_, address oracle_, address usdc_)
        EIP712("MoltSignalEscrow", "1")
        Ownable(owner_)
    {
        require(usdc_ != address(0), "invalid usdc address");
        oracle = oracle_;
        usdc = IERC20(usdc_);
    }

    /// @notice Update the oracle address
    function setOracle(address oracle_) external onlyOwner {
        oracle = oracle_;
        emit OracleUpdated(oracle_);
    }

    /// @notice Create a new campaign with USDC budget
    /// @dev Sponsor must approve this contract for `budgetUsdc` before calling
    /// @param objective Campaign description/objective
    /// @param endTime Unix timestamp when campaign ends
    /// @param budgetUsdc Amount of USDC to deposit (with decimals)
    /// @return campaignId The new campaign's ID
    function createCampaign(
        string calldata objective,
        uint64 endTime,
        uint96 budgetUsdc,
        bool /* premium */
    ) external returns (uint256 campaignId) {
        require(budgetUsdc > 0, "budget required");
        require(endTime > block.timestamp, "endTime in past");

        // Transfer USDC from sponsor to this contract
        usdc.safeTransferFrom(msg.sender, address(this), budgetUsdc);

        campaignId = nextCampaignId++;
        campaigns[campaignId] = Campaign({
            sponsor: msg.sender,
            budgetUsdc: budgetUsdc,
            endTime: endTime,
            settled: false,
            nonce: 0
        });

        emit CampaignCreated(campaignId, msg.sender, budgetUsdc, endTime, objective);
    }

    /// @notice Join a campaign as an agent
    function joinCampaign(uint256 campaignId) external {
        _join(campaignId, msg.sender);
    }

    /// @notice Join a campaign on behalf of an agent (relayer-friendly)
    /// @param campaignId The campaign to join
    /// @param agent The agent's wallet address
    /// @param agentSig Signature from agent proving consent
    function joinCampaignFor(uint256 campaignId, address agent, bytes calldata agentSig) external {
        bytes32 digest = _joinDigest(campaignId, agent);
        address signer = ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(digest), agentSig);
        require(signer == agent, "invalid agent sig");
        _join(campaignId, agent);
    }

    /// @notice Settle a campaign and distribute USDC payouts
    /// @param campaignId The campaign to settle
    /// @param rows Array of settlement rows (agent, payout, score, proofHash)
    /// @param oracleSig EIP-712 signature from oracle
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
            total += row.payoutUsdc;
            if (row.payoutUsdc == 0) {
                continue;
            }
            // Try to transfer USDC directly to agent
            // If it fails (e.g., agent is a contract that rejects), store as pending claim
            try this.transferUsdc(row.agent, row.payoutUsdc) {
                // Success - USDC transferred
            } catch {
                pendingClaims[campaignId][row.agent] += row.payoutUsdc;
            }
        }

        require(total == c.budgetUsdc, "budget mismatch");
        c.settled = true;
        c.nonce += 1;

        emit CampaignSettled(campaignId, digest, total);
    }

    /// @notice External transfer helper for try/catch pattern
    /// @dev Only callable by this contract
    function transferUsdc(address to, uint96 amount) external {
        require(msg.sender == address(this), "only self");
        usdc.safeTransfer(to, amount);
    }

    /// @notice Claim pending USDC that failed to transfer during settlement
    function claim(uint256 campaignId) external {
        uint96 amount = pendingClaims[campaignId][msg.sender];
        require(amount > 0, "nothing to claim");
        pendingClaims[campaignId][msg.sender] = 0;

        usdc.safeTransfer(msg.sender, amount);
        emit RewardClaimed(campaignId, msg.sender, amount);
    }

    /// @notice Get campaign details
    function getCampaign(uint256 campaignId) external view returns (
        address sponsor,
        uint96 budgetUsdc,
        uint64 endTime,
        bool settled,
        uint64 nonce
    ) {
        Campaign storage c = campaigns[campaignId];
        return (c.sponsor, c.budgetUsdc, c.endTime, c.settled, c.nonce);
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
                abi.encode(SETTLEMENT_TYPEHASH, rows[i].agent, rows[i].payoutUsdc, rows[i].adsScore, rows[i].proofHash)
            );
        }
        return keccak256(abi.encodePacked(hashes));
    }
}
