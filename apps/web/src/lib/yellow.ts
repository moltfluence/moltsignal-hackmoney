import {
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createECDSAMessageSigner,
  createEIP712AuthMessageSigner,
  createTransferMessage,
} from "@erc7824/nitrolite";
import WebSocket from "ws";
import { createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
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

// ──────────────────────────────────────────────
// Persistent authenticated Yellow connection
// ──────────────────────────────────────────────
type YellowConnection = {
  ws: WebSocket;
  sessionSigner: ReturnType<typeof createECDSAMessageSigner>;
  authenticated: boolean;
  ready: Promise<void>;
};

let _conn: YellowConnection | null = null;
let _connPromise: Promise<YellowConnection> | null = null;

async function getAuthenticatedConnection(): Promise<YellowConnection> {
  // Return existing connection if still open and authenticated
  if (_conn && _conn.ws.readyState === WebSocket.OPEN && _conn.authenticated) {
    return _conn;
  }

  // Avoid parallel connection attempts
  if (_connPromise) return _connPromise;

  _connPromise = (async () => {
    const env = yellowEnv();
    const mainAccount = privateKeyToAccount(env.senderPrivateKey);

    // Generate a fresh session key for this connection
    const sessionPrivateKey = generatePrivateKey();
    const sessionAccount = privateKeyToAccount(sessionPrivateKey);
    const sessionSigner = createECDSAMessageSigner(sessionPrivateKey);

    // We need a walletClient for EIP-712 signing
    const walletClient = createWalletClient({
      account: mainAccount,
      chain: sepolia,
      transport: http("https://1rpc.io/sepolia"),
    });

    const authParams = {
      session_key: sessionAccount.address,
      allowances: [{ asset: env.assetSymbol, amount: "1000000000" }],
      expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
      scope: "moltsignal.app",
    };

    const ws = new WebSocket(env.clearnodeWsUrl);

    const conn: YellowConnection = {
      ws,
      sessionSigner,
      authenticated: false,
      ready: Promise.resolve(),
    };

    // Set up authentication flow
    conn.ready = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Yellow auth timeout (30s)"));
      }, 30000);

      ws.on("open", async () => {
        console.log("[yellow] Connected to ClearNode");
        const authMsg = await createAuthRequestMessage({
          address: mainAccount.address,
          application: "MoltSignal",
          ...authParams,
        });
        ws.send(authMsg);
      });

      ws.on("message", async (data) => {
        try {
          const response = JSON.parse(data.toString());
          const type = response.res?.[1];
          const payload = response.res?.[2];

          if (type === "auth_challenge") {
            const challenge = payload.challenge_message;
            const signer = createEIP712AuthMessageSigner(
              walletClient,
              authParams,
              { name: "MoltSignal" },
            );
            const verifyMsg = await createAuthVerifyMessageFromChallenge(signer, challenge);
            ws.send(verifyMsg);
          }

          if (type === "auth_verify") {
            conn.authenticated = true;
            console.log("[yellow] Authenticated with ClearNode");
            clearTimeout(timeout);
            resolve();
          }

          if (response.error) {
            console.error("[yellow] RPC error:", JSON.stringify(response.error));
          }
        } catch {
          // ignore parse errors
        }
      });

      ws.on("error", (err) => {
        console.error("[yellow] WS error:", err.message);
        clearTimeout(timeout);
        reject(err);
      });

      ws.on("close", () => {
        console.log("[yellow] WS closed");
        conn.authenticated = false;
        if (_conn === conn) {
          _conn = null;
          _connPromise = null;
        }
      });
    });

    await conn.ready;
    _conn = conn;
    _connPromise = null;
    return conn;
  })();

  try {
    return await _connPromise;
  } catch (err) {
    _connPromise = null;
    throw err;
  }
}

// ──────────────────────────────────────────────
// Send an off-chain transfer via authenticated connection
// ──────────────────────────────────────────────
async function sendTransfer(params: {
  recipient: `0x${string}`;
  assetSymbol: string;
  amountAtomic: string;
}): Promise<{ yellowTransferId: string }> {
  const conn = await getAuthenticatedConnection();

  const transferMsg = await createTransferMessage(
    conn.sessionSigner,
    {
      destination: params.recipient,
      allocations: [{ asset: params.assetSymbol, amount: params.amountAtomic }],
    },
    Date.now(),
  );

  return new Promise((resolve) => {
    let transferId: string | undefined;
    const handler = (data: WebSocket.Data) => {
      try {
        const response = JSON.parse(data.toString());
        const type = response.res?.[1];
        const payload = response.res?.[2];

        if (type === "transfer" && payload?.transactions) {
          const tx = payload.transactions[0];
          transferId = String(tx?.id ?? "");
          conn.ws.off("message", handler);
          clearTimeout(timer);
          resolve({ yellowTransferId: transferId || `tx:${Date.now()}` });
        }

        // Also check for "tr" shorthand
        if (type === "tr" && payload?.transactions) {
          const tx = payload.transactions[0];
          transferId = String(tx?.id ?? "");
          conn.ws.off("message", handler);
          clearTimeout(timer);
          resolve({ yellowTransferId: transferId || `tx:${Date.now()}` });
        }
      } catch {
        // ignore
      }
    };

    conn.ws.on("message", handler);
    conn.ws.send(transferMsg);

    // Timeout after 10s — still record the payment attempt
    const timer = setTimeout(() => {
      conn.ws.off("message", handler);
      resolve({ yellowTransferId: `pending:${Date.now()}` });
    }, 10000);
  });
}

// ──────────────────────────────────────────────
// Public API — called from proof submission route
// ──────────────────────────────────────────────
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

  // Ensure a YellowSession record exists for tracking
  const session = await db.yellowSession.upsert({
    where: { campaignId_agentId: { campaignId: params.campaignId, agentId: params.agentId } },
    update: {},
    create: {
      campaignId: params.campaignId,
      agentId: params.agentId,
      sessionId: `yellow:${params.campaignId}:${params.agentId}`,
      status: "OPEN",
    },
  });

  // Send the micropayment via authenticated Yellow connection
  const transfer = await sendTransfer({
    recipient: params.agentWallet,
    assetSymbol: env.assetSymbol,
    amountAtomic: env.payPerValidProofAtomic,
  });

  console.log(`[yellow] Micropayment sent: ${env.payPerValidProofAtomic} ${env.assetSymbol} -> ${params.agentWallet} (txId: ${transfer.yellowTransferId})`);

  // Record in DB
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
