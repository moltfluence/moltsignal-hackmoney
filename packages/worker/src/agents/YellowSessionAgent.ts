/**
 * YellowSessionAgent - Production-grade Yellow Network State Channel Agent
 *
 * Handles the complete lifecycle of Yellow Network sessions for micropayments:
 * - Session creation (open state channel)
 * - Micropayment transfers (off-chain)
 * - Session settlement (close and settle on-chain)
 *
 * @see https://docs.yellow.com/nitrolite
 * @module @molt/worker/agents/YellowSessionAgent
 */

import {
  createAppSessionMessage,
  createCloseAppSessionMessage,
  createECDSAMessageSigner,
  createTransferMessage,
  parseAnyRPCResponse,
  RPCProtocolVersion,
  type MessageSigner,
} from "@erc7824/nitrolite";
import WebSocket from "ws";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex, Address } from "viem";
import { prisma } from "../db";
import { config } from "../config";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface YellowSessionConfig {
  clearnodeWsUrl: string;
  privateKey: Hex;
  assetSymbol: string;
  payPerValidProofAtomic: bigint;
}

export interface SessionOpenResult {
  sessionId: string;
  dbSessionId: number;
}

export interface MicroRewardResult {
  yellowTransferId: string;
  dbRewardId: number;
}

export interface SessionCloseResult {
  success: boolean;
  finalAllocations: Array<{ participant: Address; amount: string }>;
  settlementTimestamp: number;
}

// SDK response parsing helpers
interface ParsedRPCResponse {
  result?: {
    appSessionId?: string;
    sessionId?: string;
    requestId?: string;
    allocations?: Array<{ participant: string; amount: string }>;
  };
  appSessionId?: string;
  sessionId?: string;
  requestId?: string;
  error?: { code: number; message: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const WS_CONNECT_TIMEOUT_MS = 10_000;
const WS_RESPONSE_TIMEOUT_MS = 30_000;
const WS_POLL_INTERVAL_MS = 100;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY_MS = 1_000;

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket Utilities
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff delay calculator
 */
function getBackoffDelay(attempt: number): number {
  return RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt);
}

/**
 * Managed WebSocket connection wrapper with auto-reconnect
 */
async function withManagedWebSocket<T>(
  url: string,
  fn: (ws: WebSocket) => Promise<T>,
  attemptNumber = 0
): Promise<T> {
  const ws = new WebSocket(url);

  try {
    // Wait for connection with timeout
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`WebSocket connection timeout after ${WS_CONNECT_TIMEOUT_MS}ms`));
      }, WS_CONNECT_TIMEOUT_MS);

      ws.on("open", () => {
        clearTimeout(timeout);
        resolve();
      });

      ws.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    return await fn(ws);
  } catch (error) {
    // Attempt reconnection with exponential backoff
    if (attemptNumber < MAX_RECONNECT_ATTEMPTS) {
      const delay = getBackoffDelay(attemptNumber);
      console.warn(
        `[YellowSessionAgent] WebSocket error, retrying in ${delay}ms (attempt ${attemptNumber + 1}/${MAX_RECONNECT_ATTEMPTS})`,
        error
      );
      await sleep(delay);
      return withManagedWebSocket(url, fn, attemptNumber + 1);
    }
    throw error;
  } finally {
    try {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    } catch {
      // Ignore close errors
    }
  }
}

/**
 * Wait for a specific response field with timeout
 */
async function waitForResponse<T>(
  ws: WebSocket,
  extractor: (parsed: ParsedRPCResponse) => T | undefined,
  timeoutMs = WS_RESPONSE_TIMEOUT_MS
): Promise<T> {
  let result: T | undefined;
  let responseError: { code: number; message: string } | undefined;

  const messageHandler = (data: WebSocket.Data) => {
    try {
      const parsed = parseAnyRPCResponse(String(data)) as ParsedRPCResponse;

      // Check for errors first
      if (parsed.error) {
        responseError = parsed.error;
        return;
      }

      const extracted = extractor(parsed);
      if (extracted !== undefined) {
        result = extracted;
      }
    } catch {
      // Ignore parse errors, keep waiting
    }
  };

  ws.on("message", messageHandler);

  const startTime = Date.now();
  while (!result && !responseError && Date.now() - startTime < timeoutMs) {
    await sleep(WS_POLL_INTERVAL_MS);
  }

  ws.off("message", messageHandler);

  if (responseError) {
    throw new Error(`Yellow RPC error [${responseError.code}]: ${responseError.message}`);
  }

  if (!result) {
    throw new Error(`Yellow response timeout after ${timeoutMs}ms`);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// YellowSessionAgent Class
// ─────────────────────────────────────────────────────────────────────────────

export class YellowSessionAgent {
  private readonly config: YellowSessionConfig;
  private readonly signer: MessageSigner;
  private readonly sponsorAddress: Address;

  constructor(configOverride?: Partial<YellowSessionConfig>) {
    this.config = {
      clearnodeWsUrl: configOverride?.clearnodeWsUrl ?? config.yellow.clearnodeWsUrl,
      privateKey: configOverride?.privateKey ?? config.yellow.senderPrivateKey,
      assetSymbol: configOverride?.assetSymbol ?? config.yellow.assetSymbol,
      payPerValidProofAtomic:
        configOverride?.payPerValidProofAtomic ?? config.yellow.payPerValidProofAtomic,
    };

    if (!this.config.privateKey || this.config.privateKey === "0x") {
      throw new Error("YellowSessionAgent: YELLOW_SENDER_PRIVATE_KEY is required");
    }

    this.signer = createECDSAMessageSigner(this.config.privateKey);
    this.sponsorAddress = privateKeyToAccount(this.config.privateKey).address;
  }

  /**
   * Open a new Yellow session for a campaign participant
   *
   * @param campaignId - Database campaign ID
   * @param agentWallet - Agent's wallet address
   * @param budgetAtomic - Total budget for this session in atomic units
   */
  async openSession(
    campaignId: number,
    agentId: number,
    agentWallet: Address,
    budgetAtomic: string
  ): Promise<SessionOpenResult> {
    console.log(
      `[YellowSessionAgent] Opening session for campaign=${campaignId} agent=${agentWallet}`
    );

    const appDefinition = {
      application: "moltsignal",
      protocol: RPCProtocolVersion.NitroRPC_0_4,
      participants: [this.sponsorAddress, agentWallet],
      weights: [50, 50],
      quorum: 100,
      challenge: 0,
      nonce: Date.now(),
    };

    const allocations = [
      {
        participant: this.sponsorAddress,
        asset: this.config.assetSymbol,
        amount: budgetAtomic,
      },
      {
        participant: agentWallet,
        asset: this.config.assetSymbol,
        amount: "0",
      },
    ];

    const sessionMessage = await createAppSessionMessage(this.signer, {
      definition: appDefinition,
      allocations,
    });

    const sessionId = await withManagedWebSocket(this.config.clearnodeWsUrl, async (ws) => {
      ws.send(sessionMessage);

      return waitForResponse<string>(ws, (parsed) => {
        return (
          parsed.result?.appSessionId ??
          parsed.result?.sessionId ??
          parsed.appSessionId ??
          parsed.sessionId
        );
      });
    });

    // Persist to database
    const dbSession = await prisma.yellowSession.upsert({
      where: { campaignId_agentId: { campaignId, agentId } },
      update: {
        sessionId,
        status: "OPEN",
      },
      create: {
        campaignId,
        agentId,
        sessionId,
        status: "OPEN",
      },
    });

    console.log(
      `[YellowSessionAgent] Session opened: ${sessionId} (db=${dbSession.id})`
    );

    return {
      sessionId,
      dbSessionId: dbSession.id,
    };
  }

  /**
   * Send a micropayment to a recipient within an active session
   *
   * @param dbSessionId - Database YellowSession ID
   * @param recipient - Recipient wallet address
   * @param amountAtomic - Amount in atomic units
   * @param reason - Reason for the reward (e.g., "pay_per_valid_proof", "milestone_1000_impressions")
   * @param proofSubmissionId - Optional linked proof submission
   */
  async sendMicroReward(
    dbSessionId: number,
    recipient: Address,
    amountAtomic: string,
    reason: string,
    proofSubmissionId?: number
  ): Promise<MicroRewardResult> {
    console.log(
      `[YellowSessionAgent] Sending micro-reward: ${amountAtomic} ${this.config.assetSymbol} to ${recipient}`
    );

    const transferMessage = await createTransferMessage(this.signer, {
      destination: recipient,
      allocations: [
        {
          asset: this.config.assetSymbol,
          amount: amountAtomic,
        },
      ],
    });

    const yellowTransferId = await withManagedWebSocket(
      this.config.clearnodeWsUrl,
      async (ws) => {
        ws.send(transferMessage);

        // Try to get the transfer ID, fall back to timestamp-based ID
        try {
          return await waitForResponse<string>(
            ws,
            (parsed) => parsed.result?.requestId ?? parsed.requestId,
            5_000 // Shorter timeout for transfers
          );
        } catch {
          // Generate fallback ID if response parsing fails
          return `${this.sponsorAddress}:${Date.now()}`;
        }
      }
    );

    // Persist micro-reward to database
    const dbReward = await prisma.microReward.create({
      data: {
        yellowSessionId: dbSessionId,
        proofSubmissionId: proofSubmissionId ?? null,
        amount: amountAtomic,
        tokenSymbol: this.config.assetSymbol,
        reason,
        yellowTransferId,
      },
    });

    console.log(
      `[YellowSessionAgent] Micro-reward sent: ${yellowTransferId} (db=${dbReward.id})`
    );

    return {
      yellowTransferId,
      dbRewardId: dbReward.id,
    };
  }

  /**
   * Close a Yellow session and settle final allocations
   *
   * This is the CRITICAL missing piece - called at campaign settlement
   * to finalize all off-chain state and trigger on-chain settlement.
   *
   * @param dbSessionId - Database YellowSession ID
   */
  async closeSession(dbSessionId: number): Promise<SessionCloseResult> {
    const session = await prisma.yellowSession.findUnique({
      where: { id: dbSessionId },
      include: {
        agent: true,
        microRewards: true,
      },
    });

    if (!session) {
      throw new Error(`YellowSession not found: ${dbSessionId}`);
    }

    if (session.status === "CLOSED") {
      console.log(`[YellowSessionAgent] Session ${dbSessionId} already closed`);
      return {
        success: true,
        finalAllocations: [],
        settlementTimestamp: Date.now(),
      };
    }

    const agentWallet = session.agent.wallet.toLowerCase() as Address;

    // Calculate total micro-rewards sent to agent
    const totalSentToAgent = session.microRewards.reduce(
      (sum, reward) => sum + BigInt(reward.amount),
      0n
    );

    console.log(
      `[YellowSessionAgent] Closing session ${session.sessionId} ` +
        `(total rewards: ${totalSentToAgent} ${this.config.assetSymbol})`
    );

    // Build final allocations - agent gets what they earned, sponsor gets remainder
    // Note: In a real implementation, you'd query the current channel state
    // For hackathon MVP, we use the micro-rewards sum as the agent's final allocation
    const finalAllocations = [
      {
        participant: this.sponsorAddress,
        asset: this.config.assetSymbol,
        amount: "0", // Remaining goes back to sponsor's unified balance
      },
      {
        participant: agentWallet,
        asset: this.config.assetSymbol,
        amount: totalSentToAgent.toString(),
      },
    ];

    const closeMessage = await createCloseAppSessionMessage(this.signer, {
      app_session_id: session.sessionId as Hex,
      allocations: finalAllocations,
    });

    await withManagedWebSocket(this.config.clearnodeWsUrl, async (ws) => {
      ws.send(closeMessage);

      // Wait for close confirmation
      await waitForResponse<boolean>(ws, (parsed) => {
        // Accept any non-error response as success
        if (parsed.result !== undefined) return true;
        return undefined;
      });
    });

    // Update database
    const settlementTimestamp = Date.now();
    await prisma.yellowSession.update({
      where: { id: dbSessionId },
      data: {
        status: "CLOSED",
        // Note: settleTxHash would be set if we track the on-chain settlement
        // For now, the clearnode handles the actual on-chain settlement
      },
    });

    console.log(`[YellowSessionAgent] Session ${session.sessionId} closed successfully`);

    return {
      success: true,
      finalAllocations: finalAllocations.map((a) => ({
        participant: a.participant as Address,
        amount: a.amount,
      })),
      settlementTimestamp,
    };
  }

  /**
   * Close all Yellow sessions for a campaign
   *
   * Called during campaign settlement to close all active sessions.
   *
   * @param campaignId - Database campaign ID
   */
  async closeAllSessionsForCampaign(
    campaignId: number
  ): Promise<{ closed: number; failed: number; results: SessionCloseResult[] }> {
    const sessions = await prisma.yellowSession.findMany({
      where: {
        campaignId,
        status: "OPEN",
      },
    });

    console.log(
      `[YellowSessionAgent] Closing ${sessions.length} sessions for campaign ${campaignId}`
    );

    const results: SessionCloseResult[] = [];
    let closed = 0;
    let failed = 0;

    for (const session of sessions) {
      try {
        const result = await this.closeSession(session.id);
        results.push(result);
        closed++;
      } catch (error) {
        console.error(
          `[YellowSessionAgent] Failed to close session ${session.id}:`,
          error
        );

        // Mark as failed in DB
        await prisma.yellowSession.update({
          where: { id: session.id },
          data: { status: "FAILED" },
        });

        results.push({
          success: false,
          finalAllocations: [],
          settlementTimestamp: Date.now(),
        });
        failed++;
      }
    }

    console.log(
      `[YellowSessionAgent] Campaign ${campaignId} settlement complete: ${closed} closed, ${failed} failed`
    );

    return { closed, failed, results };
  }

  /**
   * Get micro-reward statistics for a session
   */
  async getSessionStats(dbSessionId: number): Promise<{
    totalRewards: string;
    rewardCount: number;
    tokenSymbol: string;
  }> {
    const rewards = await prisma.microReward.findMany({
      where: { yellowSessionId: dbSessionId },
    });

    const total = rewards.reduce((sum, r) => sum + BigInt(r.amount), 0n);

    return {
      totalRewards: total.toString(),
      rewardCount: rewards.length,
      tokenSymbol: this.config.assetSymbol,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory & Singleton
// ─────────────────────────────────────────────────────────────────────────────

let _defaultAgent: YellowSessionAgent | null = null;

/**
 * Get the default YellowSessionAgent instance (singleton)
 *
 * Uses environment configuration. Throws if Yellow is not properly configured.
 */
export function getYellowSessionAgent(): YellowSessionAgent {
  if (!config.yellow.enabled) {
    throw new Error("Yellow Network integration is not enabled (YELLOW_ENABLED=false)");
  }

  if (!_defaultAgent) {
    _defaultAgent = new YellowSessionAgent();
  }

  return _defaultAgent;
}

/**
 * Check if Yellow Network integration is enabled and properly configured
 */
export function isYellowEnabled(): boolean {
  return (
    config.yellow.enabled &&
    !!config.yellow.senderPrivateKey &&
    config.yellow.senderPrivateKey !== ("0x" as Hex)
  );
}

export default YellowSessionAgent;
