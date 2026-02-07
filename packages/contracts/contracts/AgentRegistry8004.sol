// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title AgentRegistry8004
/// @notice ERC-8004 Identity Registry — each agent gets an NFT-based identity.
contract AgentRegistry8004 is ERC721, Ownable {
    struct MetadataEntry {
        string key;
        bytes value;
    }

    uint256 private _nextAgentId = 1;

    bytes32 public constant REGISTER_PREFIX = keccak256("REGISTER_AGENT");

    // agentId → agentURI (JSON metadata)
    mapping(uint256 => string) private _agentURIs;

    // agentId → key → value
    mapping(uint256 => mapping(string => bytes)) private _metadata;

    event Registered(uint256 indexed agentId, address indexed wallet, string agentURI);
    event URIUpdated(uint256 indexed agentId, string newURI);
    event MetadataSet(uint256 indexed agentId, string key, bytes value);

    constructor(address owner_) ERC721("MoltSignal Agent", "MOLT-AGENT") Ownable(owner_) {}

    /// @notice Register a new agent identity and mint an NFT.
    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = _nextAgentId++;
        _mint(msg.sender, agentId);
        _agentURIs[agentId] = agentURI;
        emit Registered(agentId, msg.sender, agentURI);
    }

    /// @notice Register on behalf of a wallet (relayer-friendly). Requires a wallet signature over
    ///         (REGISTER_AGENT, chainId, wallet, keccak256(handle)).
    function registerFor(
        address wallet,
        string calldata moltbookHandle,
        string calldata agentURI,
        bytes calldata walletSig
    ) external returns (uint256 agentId) {
        bytes32 digest = _registerDigest(wallet, moltbookHandle);
        address signer = ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(digest), walletSig);
        require(signer == wallet, "invalid sig");

        agentId = _nextAgentId++;
        _mint(wallet, agentId);
        _agentURIs[agentId] = agentURI;
        emit Registered(agentId, wallet, agentURI);
    }

    /// @notice Register with initial metadata entries.
    function registerWithMetadata(
        string calldata agentURI,
        MetadataEntry[] calldata metadata
    ) external returns (uint256 agentId) {
        agentId = _nextAgentId++;
        _mint(msg.sender, agentId);
        _agentURIs[agentId] = agentURI;
        emit Registered(agentId, msg.sender, agentURI);

        for (uint256 i = 0; i < metadata.length; i++) {
            _metadata[agentId][metadata[i].key] = metadata[i].value;
            emit MetadataSet(agentId, metadata[i].key, metadata[i].value);
        }
    }

    /// @notice Update the agentURI for a given agent. Owner only.
    function setAgentURI(uint256 agentId, string calldata newURI) external {
        require(ownerOf(agentId) == msg.sender, "not agent owner");
        _agentURIs[agentId] = newURI;
        emit URIUpdated(agentId, newURI);
    }

    /// @notice Get the wallet address that owns the agent NFT.
    function getAgentWallet(uint256 agentId) external view returns (address) {
        return ownerOf(agentId);
    }

    /// @notice Transfer agent identity to a new wallet. Owner only.
    function setAgentWallet(uint256 agentId, address newWallet) external {
        require(ownerOf(agentId) == msg.sender, "not agent owner");
        _transfer(msg.sender, newWallet, agentId);
    }

    /// @notice Get metadata value for a given key.
    function getMetadata(uint256 agentId, string calldata key) external view returns (bytes memory) {
        require(ownerOf(agentId) != address(0), "agent does not exist");
        return _metadata[agentId][key];
    }

    /// @notice Set metadata for a given agent. Owner only.
    function setMetadata(uint256 agentId, string calldata key, bytes calldata value) external {
        require(ownerOf(agentId) == msg.sender, "not agent owner");
        _metadata[agentId][key] = value;
        emit MetadataSet(agentId, key, value);
    }

    /// @notice Returns the agentURI as the token URI.
    function tokenURI(uint256 agentId) public view override returns (string memory) {
        require(ownerOf(agentId) != address(0), "agent does not exist");
        return _agentURIs[agentId];
    }

    function _registerDigest(address wallet, string calldata moltbookHandle) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(REGISTER_PREFIX, block.chainid, wallet, keccak256(bytes(moltbookHandle))));
    }
}
