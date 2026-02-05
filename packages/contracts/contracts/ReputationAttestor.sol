// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ReputationAttestor is EIP712, Ownable {
    struct Attestation {
        address agent;
        int32 adsDelta;
        uint32 adsAfter;
        bytes32 metricsHash;
    }

    bytes32 private constant ATTESTATION_TYPEHASH =
        keccak256("Attestation(address agent,int32 adsDelta,uint32 adsAfter,bytes32 metricsHash)");
    bytes32 private constant ATTESTATION_DATA_TYPEHASH =
        keccak256("AttestationData(uint256 campaignId,uint256 nonce,bytes32 rowsHash)");

    address public oracle;

    mapping(uint256 => uint256) public campaignNonce;
    mapping(address => uint32) public currentAds;

    event Attested(
        uint256 indexed campaignId,
        address indexed agent,
        int32 adsDelta,
        uint32 adsAfter,
        bytes32 metricsHash
    );
    event OracleUpdated(address indexed oracle);

    constructor(address owner_, address oracle_) EIP712("MoltSignalAttestor", "1") Ownable(owner_) {
        oracle = oracle_;
    }

    function setOracle(address oracle_) external onlyOwner {
        oracle = oracle_;
        emit OracleUpdated(oracle_);
    }

    function attestBatch(uint256 campaignId, Attestation[] calldata rows, bytes calldata oracleSig) external {
        require(rows.length > 0, "rows required");

        uint256 nonce = campaignNonce[campaignId];
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(ATTESTATION_DATA_TYPEHASH, campaignId, nonce, _hashAttestationRows(rows)))
        );
        address signer = ECDSA.recover(digest, oracleSig);
        require(signer == oracle, "invalid oracle sig");

        campaignNonce[campaignId] = nonce + 1;

        for (uint256 i = 0; i < rows.length; i++) {
            currentAds[rows[i].agent] = rows[i].adsAfter;
            emit Attested(campaignId, rows[i].agent, rows[i].adsDelta, rows[i].adsAfter, rows[i].metricsHash);
        }
    }

    function getAgentReputation(address agent) external view returns (uint32) {
        return currentAds[agent];
    }

    function _hashAttestationRows(Attestation[] calldata rows) internal pure returns (bytes32) {
        bytes32[] memory hashes = new bytes32[](rows.length);
        for (uint256 i = 0; i < rows.length; i++) {
            hashes[i] = keccak256(
                abi.encode(ATTESTATION_TYPEHASH, rows[i].agent, rows[i].adsDelta, rows[i].adsAfter, rows[i].metricsHash)
            );
        }
        return keccak256(abi.encodePacked(hashes));
    }
}
