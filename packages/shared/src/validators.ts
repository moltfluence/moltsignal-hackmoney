import { z } from "zod";

export const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "invalid wallet address")
  .transform((value) => value.toLowerCase());

export const registerAgentSchema = z.object({
  wallet: addressSchema,
  moltbookHandle: z.string().min(1).max(64),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

export const createCampaignSchema = z.object({
  objective: z.string().min(5).max(500),
  // USDC amount (human or numeric); the onchain rail uses atomic units (see app config).
  budgetUsdc: z.union([z.string(), z.number()]),
  endTime: z.string().datetime(),
  premium: z.boolean().default(false),
  yellowEnabled: z.boolean().default(false),
});

export const joinCampaignSchema = z.object({
  wallet: addressSchema,
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

export const submitProofSchema = z.object({
  wallet: addressSchema,
  postUrl: z.string().url(),
  claimedMetrics: z.record(z.any()).optional(),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});
