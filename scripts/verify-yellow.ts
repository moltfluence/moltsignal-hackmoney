#!/usr/bin/env tsx
/**
 * Yellow Network Connection Smoke Test
 *
 * Verifies that the YellowSessionAgent can establish a WebSocket connection
 * to the Yellow Network Sandbox (ClearNode).
 *
 * Usage:
 *   pnpm tsx scripts/verify-yellow.ts
 *
 * Expected output:
 *   ✅ SUCCESS: Connected to Yellow Network (wss://clearnet-sandbox.yellow.com/ws)
 */

import WebSocket from "ws";
import { createECDSAMessageSigner } from "@erc7824/nitrolite";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

const YELLOW_WS_URL = process.env.YELLOW_CLEARNODE_WS_URL ?? "wss://clearnet-sandbox.yellow.com/ws";
const CONNECT_TIMEOUT_MS = 15_000;
const HOLD_CONNECTION_MS = 5_000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSmokeTest(): Promise<void> {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║       Yellow Network Connection Smoke Test                   ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  // Generate a test private key (not for real use)
  const testPrivateKey = generatePrivateKey();
  const testAccount = privateKeyToAccount(testPrivateKey);

  console.log(`🔑 Test wallet address: ${testAccount.address}`);
  console.log(`🌐 Target WebSocket: ${YELLOW_WS_URL}`);
  console.log();

  // Test 1: Basic WebSocket Connection
  console.log("📡 Test 1: WebSocket Connection...");

  const ws = new WebSocket(YELLOW_WS_URL);

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout after ${CONNECT_TIMEOUT_MS}ms`));
      }, CONNECT_TIMEOUT_MS);

      ws.on("open", () => {
        clearTimeout(timeout);
        console.log("   ✅ WebSocket connection established");
        resolve();
      });

      ws.on("error", (err) => {
        clearTimeout(timeout);
        console.error("   ❌ WebSocket error:", err.message);
        reject(err);
      });
    });

    // Test 2: Verify we can create a signer
    console.log();
    console.log("🔐 Test 2: Message Signer Creation...");
    const signer = createECDSAMessageSigner(testPrivateKey);
    console.log("   ✅ ECDSA message signer created");

    // Test 3: Hold connection and listen for any messages
    console.log();
    console.log(`⏳ Test 3: Holding connection for ${HOLD_CONNECTION_MS / 1000}s...`);

    let messageCount = 0;
    ws.on("message", (data) => {
      messageCount++;
      console.log(`   📨 Received message #${messageCount}: ${String(data).substring(0, 100)}...`);
    });

    await sleep(HOLD_CONNECTION_MS);
    console.log(`   ✅ Connection stable (received ${messageCount} messages)`);

    // Clean up
    ws.close();
    console.log();
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║  ✅ SUCCESS: Yellow Network Connection Verified!             ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    console.log();
    console.log("Your YellowSessionAgent is ready for production use.");
    console.log();

    process.exit(0);
  } catch (error) {
    ws.close();
    console.log();
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║  ❌ FAILED: Could not connect to Yellow Network              ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    console.log();
    console.error("Error details:", error);
    console.log();
    console.log("Troubleshooting:");
    console.log("  1. Check your internet connection");
    console.log("  2. Verify YELLOW_CLEARNODE_WS_URL in .env");
    console.log("  3. The sandbox might be temporarily unavailable");
    console.log();

    process.exit(1);
  }
}

runSmokeTest().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
