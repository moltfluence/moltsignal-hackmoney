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

export const stakeGateAbi = [
  {
    type: "function",
    name: "hasRequiredStake",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "ok", type: "bool" }],
  },
] as const;
