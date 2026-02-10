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
  minProofsPerAgent: z.number().int().min(1).max(50).optional().default(1),
  keywords: z.array(z.string()).optional(),
  milestones: z.array(z.object({
    task: z.string().min(3).max(500),
    rewardUsdc: z.union([z.string(), z.number()]),
    maxAgents: z.number().int().min(1).max(1000).optional().default(10),
    orderIndex: z.number().int().min(0).optional().default(0),
    requiresMilestoneIndex: z.number().int().min(0).optional(),
    keywords: z.array(z.string()).optional(),
  })).optional(),
});

export const joinCampaignSchema = z.object({
  wallet: addressSchema,
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

export const submitProofSchema = z.object({
  wallet: addressSchema,
  postUrl: z.string().url(),
  milestoneId: z.number().int().optional(),
  claimedMetrics: z.record(z.any()).optional(),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});
