/**
 * Yellow Network E2E Test — Proper Auth + Transfer Flow
 * 
 * Follows the official Quickstart:
 *   1. Connect to sandbox WS
 *   2. auth_request (with session key)
 *   3. Handle auth_challenge (EIP-712 sign with main wallet)
 *   4. auth_verify -> authenticated
 *   5. Send transfer (off-chain micropayment)
 */

import {
  createAuthRequestMessage,
  createAuthVerifyMessageFromChallenge,
  createECDSAMessageSigner,
  createEIP712AuthMessageSigner,
  createTransferMessage,
  createGetLedgerBalancesMessage,
} from "@erc7824/nitrolite";
import { createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import WebSocket from "ws";

// ──────────── CONFIG ────────────
const WS_URL = process.env.YELLOW_CLEARNODE_WS_URL || "wss://clearnet-sandbox.yellow.com/ws";
const SENDER_KEY = (process.env.YELLOW_SENDER_PRIVATE_KEY || "0x8b12e246bd10804b1595988af44ea838c357d3eb15680b64e36c767f8030eb05") as `0x${string}`;
const AGENT_WALLET = "0xb61a8602E583c4418E09CC04E03b024e4A316630" as `0x${string}`;
const ASSET = process.env.YELLOW_ASSET_SYMBOL || "ytest.usd";
const TRANSFER_AMOUNT = "100000"; // 0.1 ytest.usd

// ──────────── SETUP ────────────
const mainAccount = privateKeyToAccount(SENDER_KEY);
const sessionPrivateKey = generatePrivateKey();
const sessionAccount = privateKeyToAccount(sessionPrivateKey);
const sessionSigner = createECDSAMessageSigner(sessionPrivateKey);

// walletClient for EIP-712 signing (Yellow auth uses sepolia types but sandbox doesn't enforce chain)
const walletClient = createWalletClient({
  account: mainAccount,
  chain: sepolia,
  transport: http("https://1rpc.io/sepolia"),
});

const authParams = {
  session_key: sessionAccount.address,
  allowances: [{ asset: ASSET, amount: "1000000000" }],
  expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
  scope: "moltsignal.app",
};

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  Yellow Network E2E — Auth + Transfer Test   ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`  Main wallet: ${mainAccount.address}`);
  console.log(`  Session key: ${sessionAccount.address}`);
  console.log(`  Recipient:   ${AGENT_WALLET}`);
  console.log(`  Asset:        ${ASSET}`);
  console.log(`  WS URL:       ${WS_URL}`);

  const ws = new WebSocket(WS_URL);

  let authenticated = false;
  let transferDone = false;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Overall timeout (60s)"));
    }, 60000);

    ws.on("open", async () => {
      console.log("\n[1] Connected to ClearNode");

      // Send auth_request
      console.log("[2] Sending auth_request...");
      const authMsg = await createAuthRequestMessage({
        address: mainAccount.address,
        application: "MoltSignal",
        ...authParams,
      });
      ws.send(authMsg);
    });

    ws.on("message", async (data) => {
      const raw = data.toString();
      let response: any;
      try {
        response = JSON.parse(raw);
      } catch {
        console.log("  [ws] Non-JSON message:", raw.slice(0, 100));
        return;
      }

      // Handle errors
      if (response.error) {
        console.error("  [ws] ERROR:", JSON.stringify(response.error));
        return;
      }

      const type = response.res?.[1];
      const payload = response.res?.[2];

      if (type === "auth_challenge") {
        console.log("[3] Received auth_challenge, signing with EIP-712...");
        try {
          const challenge = payload.challenge_message;
          const signer = createEIP712AuthMessageSigner(
            walletClient,
            authParams,
            { name: "MoltSignal" }
          );
          const verifyMsg = await createAuthVerifyMessageFromChallenge(signer, challenge);
          ws.send(verifyMsg);
          console.log("    auth_verify sent");
        } catch (err) {
          console.error("    EIP-712 signing failed:", (err as Error).message);
        }
      }

      if (type === "auth_verify") {
        authenticated = true;
        console.log("[4] AUTHENTICATED!");
        console.log("    Session key:", payload.session_key);

        // Check ledger balances
        console.log("[5] Checking ledger balances...");
        const balanceMsg = await createGetLedgerBalancesMessage(
          sessionSigner,
          mainAccount.address,
          Date.now()
        );
        ws.send(balanceMsg);

        // Small delay then send transfer
        await sleep(2000);

        console.log(`[6] Sending transfer: ${TRANSFER_AMOUNT} ${ASSET} -> ${AGENT_WALLET}`);
        const transferMsg = await createTransferMessage(
          sessionSigner,
          {
            destination: AGENT_WALLET,
            allocations: [{ asset: ASSET, amount: TRANSFER_AMOUNT }],
          },
          Date.now()
        );
        ws.send(transferMsg);
      }

      if (type === "get_ledger_balances") {
        console.log("    Ledger balances:", JSON.stringify(payload).slice(0, 300));
      }

      if (type === "transfer") {
        transferDone = true;
        console.log("[7] TRANSFER CONFIRMED!");
        console.log("    Transfer details:", JSON.stringify(payload).slice(0, 500));
        clearTimeout(timeout);
        ws.close();
        resolve();
      }

      // Log any other responses
      if (type && !["auth_challenge", "auth_verify", "transfer", "get_ledger_balances", "ping", "pong"].includes(type)) {
        console.log(`  [ws] ${type}:`, JSON.stringify(payload).slice(0, 200));
      }
    });

    ws.on("error", (err) => {
      console.error("  [ws] Connection error:", err.message);
      clearTimeout(timeout);
      reject(err);
    });

    ws.on("close", () => {
      if (!transferDone) {
        clearTimeout(timeout);
        if (authenticated) {
          console.log("\n  WS closed after auth. Transfer may not have completed.");
          resolve(); // Still resolve to see what happened
        } else {
          reject(new Error("WS closed before authentication"));
        }
      }
    });
  });

  console.log("\n" + "=".repeat(50));
  console.log("  YELLOW E2E RESULTS");
  console.log("=".repeat(50));
  console.log(`  Authenticated: ${authenticated ? "YES" : "NO"}`);
  console.log(`  Transfer sent: ${transferDone ? "YES" : "NO"}`);
  console.log(`  Sender:        ${mainAccount.address}`);
  console.log(`  Recipient:     ${AGENT_WALLET}`);
  console.log(`  Amount:        ${TRANSFER_AMOUNT} ${ASSET}`);
  console.log("=".repeat(50));
}

main().catch(err => {
  console.error("\nFATAL:", err.message);
  process.exit(1);
});
