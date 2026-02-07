export const campaignEscrowAbi = [
  {
    type: "function",
    name: "createCampaign",
    stateMutability: "payable",
    inputs: [
      { name: "objective", type: "string" },
      { name: "endTime", type: "uint64" },
      { name: "premium", type: "bool" },
    ],
    outputs: [{ name: "campaignId", type: "uint256" }],
  },
  {
    type: "function",
    name: "joinCampaignFor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "agent", type: "address" },
      { name: "agentSig", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "settleCampaign",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "uint256" },
      {
        name: "rows",
        type: "tuple[]",
        components: [
          { name: "agent", type: "address" },
          { name: "payoutWei", type: "uint96" },
          { name: "adsScore", type: "uint32" },
          { name: "proofHash", type: "bytes32" },
        ],
      },
      { name: "oracleSig", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "campaigns",
    stateMutability: "view",
    inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: [
      { name: "sponsor", type: "address" },
      { name: "budgetWei", type: "uint96" },
      { name: "endTime", type: "uint64" },
      { name: "settled", type: "bool" },
      { name: "nonce", type: "uint64" },
    ],
  },
  {
    type: "event",
    name: "CampaignCreated",
    inputs: [
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: true, name: "sponsor", type: "address" },
      { indexed: false, name: "budgetWei", type: "uint96" },
      { indexed: false, name: "endTime", type: "uint64" },
      { indexed: false, name: "objective", type: "string" },
    ],
    anonymous: false,
  },
] as const;

export const reputationAttestorAbi = [
  {
    type: "function",
    name: "attestBatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "campaignId", type: "uint256" },
      {
        name: "rows",
        type: "tuple[]",
        components: [
          { name: "agent", type: "address" },
          { name: "adsDelta", type: "int32" },
          { name: "adsAfter", type: "uint32" },
          { name: "metricsHash", type: "bytes32" },
        ],
      },
      { name: "oracleSig", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "campaignNonce",
    stateMutability: "view",
    inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: [{ name: "nonce", type: "uint256" }],
  },
  {
    type: "function",
    name: "getAgentReputation",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "ads", type: "uint32" }],
  },
] as const;

export const agentRegistry8004Abi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    type: "function",
    name: "registerFor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "wallet", type: "address" },
      { name: "moltbookHandle", type: "string" },
      { name: "agentURI", type: "string" },
      { name: "walletSig", type: "bytes" },
    ],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    type: "function",
    name: "registerWithMetadata",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentURI", type: "string" },
      {
        name: "metadata",
        type: "tuple[]",
        components: [
          { name: "key", type: "string" },
          { name: "value", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    type: "function",
    name: "setAgentURI",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "newURI", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getAgentWallet",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "wallet", type: "address" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "uri", type: "string" }],
  },
  {
    type: "event",
    name: "Registered",
    inputs: [
      { indexed: true, name: "agentId", type: "uint256" },
      { indexed: true, name: "wallet", type: "address" },
      { indexed: false, name: "agentURI", type: "string" },
    ],
    anonymous: false,
  },
] as const;

export const reputationRegistry8004Abi = [
  {
    type: "function",
    name: "giveFeedback",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "readFeedback",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddress", type: "address" },
      { name: "feedbackIndex", type: "uint64" },
    ],
    outputs: [
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "isRevoked", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getSummary",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddresses", type: "address[]" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
    ],
    outputs: [
      { name: "count", type: "uint64" },
      { name: "summaryValue", type: "int128" },
      { name: "summaryValueDecimals", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "getClients",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "clients", type: "address[]" }],
  },
  {
    type: "function",
    name: "getLastIndex",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddress", type: "address" },
    ],
    outputs: [{ name: "lastIndex", type: "uint64" }],
  },
  {
    type: "event",
    name: "NewFeedback",
    inputs: [
      { indexed: true, name: "agentId", type: "uint256" },
      { indexed: true, name: "client", type: "address" },
      { indexed: false, name: "feedbackIndex", type: "uint64" },
      { indexed: false, name: "value", type: "int128" },
      { indexed: false, name: "valueDecimals", type: "uint8" },
      { indexed: false, name: "tag1", type: "string" },
      { indexed: false, name: "tag2", type: "string" },
      { indexed: false, name: "endpoint", type: "string" },
      { indexed: false, name: "feedbackURI", type: "string" },
      { indexed: false, name: "feedbackHash", type: "bytes32" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FeedbackRevoked",
    inputs: [
      { indexed: true, name: "agentId", type: "uint256" },
      { indexed: true, name: "client", type: "address" },
      { indexed: false, name: "feedbackIndex", type: "uint64" },
    ],
    anonymous: false,
  },
] as const;

export const stakeGateAbi = [
  {
    type: "function",
    name: "hasRequiredStake",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "ok", type: "bool" }],
  },
] as const;
