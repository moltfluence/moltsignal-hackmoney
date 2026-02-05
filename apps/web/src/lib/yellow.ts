import {
  createAppSessionMessage,
  createECDSAMessageSigner,
  createTransferMessage,
  parseAnyRPCResponse,
  RPCProtocolVersion,
} from "@erc7824/nitrolite";
import WebSocket from "ws";
import { privateKeyToAccount } from "viem/accounts";
import { db } from "./db";

type YellowEnv = {
  enabled: boolean;
  clearnodeWsUrl: string;
  assetSymbol: string;
  senderPrivateKey: `0x${string}`;
  payPerValidProofAtomic: string;
};

function yellowEnv(): YellowEnv {
  return {
    enabled: (process.env.YELLOW_ENABLED ?? "false").toLowerCase() === "true",
    clearnodeWsUrl: process.env.YELLOW_CLEARNODE_WS_URL ?? "wss://clearnet-sandbox.yellow.com/ws",
    assetSymbol: process.env.YELLOW_ASSET_SYMBOL ?? "ytest.usd",
    senderPrivateKey: (process.env.YELLOW_SENDER_PRIVATE_KEY ?? "") as `0x${string}`,
    payPerValidProofAtomic: process.env.YELLOW_PAY_PER_VALID_PROOF_ATOMIC ?? "0",
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withWs<T>(url: string, fn: (ws: WebSocket) => Promise<T>): Promise<T> {
  const ws = new WebSocket(url);
  try {
    await new Promise<void>((resolve, reject) => {
      ws.on("open", () => resolve());
      ws.on("error", (err) => reject(err));
    });
    return await fn(ws);
  } finally {
    try {
      ws.close();
    } catch {
      // ignore
    }
  }
}

async function createSession(params: {
  clearnodeWsUrl: string;
  senderPrivateKey: `0x${string}`;
  agentWallet: `0x${string}`;
  assetSymbol: string;
  sponsorAllocation: string;
}): Promise<{ sessionId: string }> {
  const account = privateKeyToAccount(params.senderPrivateKey);
  const messageSigner = createECDSAMessageSigner(params.senderPrivateKey);

  const sponsor = account.address;

  const appDefinition = {
    application: "moltsignal",
    protocol: RPCProtocolVersion.NitroRPC_0_4,
    participants: [sponsor, params.agentWallet],
    weights: [50, 50],
    quorum: 100,
    challenge: 0,
    nonce: Date.now(),
  };

  const allocations = [
    { participant: sponsor, asset: params.assetSymbol, amount: params.sponsorAllocation },
    { participant: params.agentWallet, asset: params.assetSymbol, amount: "0" },
  ];

  const sessionMessage = await createAppSessionMessage(messageSigner, {
    definition: appDefinition,
    allocations,
  });

  return await withWs(params.clearnodeWsUrl, async (ws) => {
    let sessionId: string | undefined;
    ws.on("message", (data) => {
      try {
        const parsed = parseAnyRPCResponse(String(data)) as unknown;
        const maybe =
          (parsed as { result?: { appSessionId?: unknown } }).result?.appSessionId ??
          (parsed as { result?: { sessionId?: unknown } }).result?.sessionId ??
          (parsed as { appSessionId?: unknown }).appSessionId ??
          (parsed as { sessionId?: unknown }).sessionId;
        if (typeof maybe === "string" && maybe.trim()) {
          sessionId = maybe.trim();
        }
      } catch {
        // ignore parse errors
      }
    });

    ws.send(sessionMessage);

    // Wait a short time for clearnode to respond.
    for (let i = 0; i < 30; i++) {
      if (sessionId) {
        return { sessionId };
      }
      await sleep(200);
    }
    throw new Error("Yellow session creation timed out");
  });
}

async function sendPayment(params: {
  clearnodeWsUrl: string;
  senderPrivateKey: `0x${string}`;
  assetSymbol: string;
  recipient: `0x${string}`;
  amountAtomic: string;
}): Promise<{ yellowTransferId?: string }> {
  const account = privateKeyToAccount(params.senderPrivateKey);
  const signer = createECDSAMessageSigner(params.senderPrivateKey);

  return await withWs(params.clearnodeWsUrl, async (ws) => {
    const msg = await createTransferMessage(signer, {
      destination: params.recipient,
      allocations: [{ asset: params.assetSymbol, amount: params.amountAtomic }],
    });

    let transferId: string | undefined;
    ws.on("message", (data) => {
      try {
        const parsed = parseAnyRPCResponse(String(data)) as unknown;
        const maybe =
          (parsed as { result?: { requestId?: unknown } }).result?.requestId ??
          (parsed as { requestId?: unknown }).requestId;
        if (typeof maybe === "string" && maybe.trim()) {
          transferId = maybe.trim();
        }
      } catch {
        // ignore
      }
    });

    ws.send(msg);

    for (let i = 0; i < 20; i++) {
      if (transferId) {
        break;
      }
      await sleep(150);
    }

    // If we didn't observe an explicit id, store the message signature-less payload hash surrogate.
    return { yellowTransferId: transferId ?? `${account.address}:${Date.now()}` };
  });
}

export async function maybePayYellowForValidProof(params: {
  campaignId: number;
  agentId: number;
  agentWallet: `0x${string}`;
  proofSubmissionId: number;
}): Promise<void> {
  const env = yellowEnv();
  if (!env.enabled) {
    return;
  }
  if (!env.senderPrivateKey || env.senderPrivateKey === ("0x" as `0x${string}`)) {
    throw new Error("YELLOW_ENABLED=true but YELLOW_SENDER_PRIVATE_KEY is not set");
  }
  if (env.payPerValidProofAtomic === "0") {
    return;
  }

  const campaign = await db.campaign.findUnique({ where: { id: params.campaignId } });
  if (!campaign?.yellowEnabled) {
    return;
  }

  const existing = await db.yellowSession.findUnique({
    where: { campaignId_agentId: { campaignId: params.campaignId, agentId: params.agentId } },
  });

  let session = existing;
  if (!session || session.status === "FAILED") {
    // Create a fresh session record and attempt to open a new session.
    const sponsorAllocation = String(BigInt(env.payPerValidProofAtomic) * 50n); // enough buffer for the demo
    const { sessionId } = await createSession({
      clearnodeWsUrl: env.clearnodeWsUrl,
      senderPrivateKey: env.senderPrivateKey,
      agentWallet: params.agentWallet,
      assetSymbol: env.assetSymbol,
      sponsorAllocation,
    });

    session = await db.yellowSession.upsert({
      where: { campaignId_agentId: { campaignId: params.campaignId, agentId: params.agentId } },
      update: { sessionId, status: "OPEN" },
      create: {
        campaignId: params.campaignId,
        agentId: params.agentId,
        sessionId,
        status: "OPEN",
      },
    });
  }

  const transfer = await sendPayment({
    clearnodeWsUrl: env.clearnodeWsUrl,
    senderPrivateKey: env.senderPrivateKey,
    assetSymbol: env.assetSymbol,
    recipient: params.agentWallet,
    amountAtomic: env.payPerValidProofAtomic,
  });

  await db.microReward.create({
    data: {
      yellowSessionId: session.id,
      proofSubmissionId: params.proofSubmissionId,
      amount: env.payPerValidProofAtomic,
      tokenSymbol: env.assetSymbol,
      reason: "pay_per_valid_proof",
      yellowTransferId: transfer.yellowTransferId,
    },
  });
}
