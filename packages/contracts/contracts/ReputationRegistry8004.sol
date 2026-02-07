// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IAgentRegistry8004 {
    function ownerOf(uint256 agentId) external view returns (address);
}

/// @title ReputationRegistry8004
/// @notice ERC-8004 Reputation Registry — stores per-agent feedback linked to Identity NFTs.
contract ReputationRegistry8004 is Ownable {
    struct Feedback {
        address client;
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        string endpoint;
        string feedbackURI;
        bytes32 feedbackHash;
        bool isRevoked;
        uint64 timestamp;
    }

    IAgentRegistry8004 public identityRegistry;

    // agentId → client → feedbacks
    mapping(uint256 => mapping(address => Feedback[])) private _feedbacks;

    // agentId → list of unique client addresses
    mapping(uint256 => address[]) private _clients;
    mapping(uint256 => mapping(address => bool)) private _clientExists;

    event NewFeedback(
        uint256 indexed agentId,
        address indexed client,
        uint64 feedbackIndex,
        int128 value,
        uint8 valueDecimals,
        string tag1,
        string tag2,
        string endpoint,
        string feedbackURI,
        bytes32 feedbackHash
    );
    event FeedbackRevoked(uint256 indexed agentId, address indexed client, uint64 feedbackIndex);

    constructor(address identityRegistry_, address owner_) Ownable(owner_) {
        identityRegistry = IAgentRegistry8004(identityRegistry_);
    }

    /// @notice Submit feedback for an agent.
    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external {
        // Verify the agent exists in the identity registry
        require(identityRegistry.ownerOf(agentId) != address(0), "agent not registered");

        // Track unique clients
        if (!_clientExists[agentId][msg.sender]) {
            _clients[agentId].push(msg.sender);
            _clientExists[agentId][msg.sender] = true;
        }

        uint64 feedbackIndex = uint64(_feedbacks[agentId][msg.sender].length);

        _feedbacks[agentId][msg.sender].push(
            Feedback({
                client: msg.sender,
                value: value,
                valueDecimals: valueDecimals,
                tag1: tag1,
                tag2: tag2,
                endpoint: endpoint,
                feedbackURI: feedbackURI,
                feedbackHash: feedbackHash,
                isRevoked: false,
                timestamp: uint64(block.timestamp)
            })
        );

        emit NewFeedback(
            agentId, msg.sender, feedbackIndex, value, valueDecimals,
            tag1, tag2, endpoint, feedbackURI, feedbackHash
        );
    }

    /// @notice Revoke previously submitted feedback. Only the original client can revoke.
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        require(feedbackIndex < _feedbacks[agentId][msg.sender].length, "feedback does not exist");
        require(!_feedbacks[agentId][msg.sender][feedbackIndex].isRevoked, "already revoked");

        _feedbacks[agentId][msg.sender][feedbackIndex].isRevoked = true;
        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    /// @notice Read a specific feedback entry.
    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex
    ) external view returns (int128 value, uint8 valueDecimals, string memory tag1, string memory tag2, bool isRevoked) {
        require(feedbackIndex < _feedbacks[agentId][clientAddress].length, "feedback does not exist");
        Feedback storage fb = _feedbacks[agentId][clientAddress][feedbackIndex];
        return (fb.value, fb.valueDecimals, fb.tag1, fb.tag2, fb.isRevoked);
    }

    /// @notice Get an aggregated summary of feedback for an agent across given clients and tags.
    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2
    ) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals) {
        summaryValueDecimals = 2; // basis points
        bytes32 t1h = keccak256(bytes(tag1));
        bytes32 t2h = keccak256(bytes(tag2));
        bool f1 = bytes(tag1).length > 0;
        bool f2 = bytes(tag2).length > 0;

        for (uint256 i = 0; i < clientAddresses.length; i++) {
            (uint64 c, int128 v) = _summarizeClient(agentId, clientAddresses[i], t1h, t2h, f1, f2);
            count += c;
            summaryValue += v;
        }
    }

    function _summarizeClient(
        uint256 agentId,
        address client,
        bytes32 t1h,
        bytes32 t2h,
        bool f1,
        bool f2
    ) internal view returns (uint64 count, int128 total) {
        Feedback[] storage entries = _feedbacks[agentId][client];
        for (uint256 j = 0; j < entries.length; j++) {
            Feedback storage fb = entries[j];
            if (fb.isRevoked) continue;
            if (f1 && keccak256(bytes(fb.tag1)) != t1h) continue;
            if (f2 && keccak256(bytes(fb.tag2)) != t2h) continue;
            total += fb.value;
            count++;
        }
    }

    /// @notice Get all unique client addresses that have given feedback for an agent.
    function getClients(uint256 agentId) external view returns (address[] memory) {
        return _clients[agentId];
    }

    /// @notice Get the last feedback index for a given agent and client.
    function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64) {
        uint256 len = _feedbacks[agentId][clientAddress].length;
        require(len > 0, "no feedback");
        return uint64(len - 1);
    }
}
