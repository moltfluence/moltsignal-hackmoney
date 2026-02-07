-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SETTLING', 'SETTLED', 'FAILED');

-- CreateEnum
CREATE TYPE "YellowSessionStatus" AS ENUM ('OPENING', 'OPEN', 'CLOSED', 'FAILED');

-- CreateTable
CREATE TABLE "agents" (
    "id" SERIAL NOT NULL,
    "wallet" TEXT NOT NULL,
    "moltbookHandle" TEXT NOT NULL,
    "registrationSig" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentAds" INTEGER NOT NULL DEFAULT 0,
    "nftTokenId" BIGINT,
    "agentUri" TEXT,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" SERIAL NOT NULL,
    "chainCampaignId" BIGINT NOT NULL,
    "sponsorWallet" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "budgetWei" TEXT NOT NULL,
    "premium" BOOLEAN NOT NULL DEFAULT false,
    "yellowEnabled" BOOLEAN NOT NULL DEFAULT false,
    "minProofsPerAgent" INTEGER NOT NULL DEFAULT 1,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_participants" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "agentId" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proof_submissions" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "agentId" INTEGER NOT NULL,
    "postUrl" TEXT NOT NULL,
    "claimedMetrics" JSONB,
    "fetchedSnapshotJson" JSONB NOT NULL,
    "proofHash" TEXT NOT NULL,
    "valid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proof_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_runs" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "weightsJson" JSONB NOT NULL,
    "scorerVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_rows" (
    "id" SERIAL NOT NULL,
    "scoreRunId" INTEGER NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "agentId" INTEGER NOT NULL,
    "distribution" DOUBLE PRECISION NOT NULL,
    "engagement" DOUBLE PRECISION NOT NULL,
    "reliability" DOUBLE PRECISION NOT NULL,
    "network" DOUBLE PRECISION NOT NULL,
    "networkUniqueActors" INTEGER NOT NULL DEFAULT 0,
    "networkTopShare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "networkEntropy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "networkInfluence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adsTotal" INTEGER NOT NULL,
    "payoutWei" TEXT NOT NULL,
    "proofHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "oracleSigner" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yellow_sessions" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "agentId" INTEGER NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "YellowSessionStatus" NOT NULL DEFAULT 'OPENING',
    "settleChainId" INTEGER,
    "settleTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yellow_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "micro_rewards" (
    "id" SERIAL NOT NULL,
    "yellowSessionId" INTEGER NOT NULL,
    "proofSubmissionId" INTEGER,
    "amount" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "yellowTransferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "micro_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "erc8004_feedback" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "agentId" INTEGER NOT NULL,
    "nftTokenId" BIGINT NOT NULL,
    "value" INTEGER NOT NULL,
    "tag1" TEXT NOT NULL DEFAULT 'moltsignal',
    "tag2" TEXT NOT NULL DEFAULT 'ads-v1',
    "txHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "erc8004_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agents_wallet_key" ON "agents"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_chainCampaignId_key" ON "campaigns"("chainCampaignId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_participants_campaignId_agentId_key" ON "campaign_participants"("campaignId", "agentId");

-- CreateIndex
CREATE INDEX "proof_submissions_campaignId_idx" ON "proof_submissions"("campaignId");

-- CreateIndex
CREATE INDEX "score_rows_campaignId_idx" ON "score_rows"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_txHash_key" ON "settlements"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "yellow_sessions_campaignId_agentId_key" ON "yellow_sessions"("campaignId", "agentId");

-- CreateIndex
CREATE INDEX "micro_rewards_proofSubmissionId_idx" ON "micro_rewards"("proofSubmissionId");

-- CreateIndex
CREATE INDEX "erc8004_feedback_campaignId_idx" ON "erc8004_feedback"("campaignId");

-- AddForeignKey
ALTER TABLE "campaign_participants" ADD CONSTRAINT "campaign_participants_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_participants" ADD CONSTRAINT "campaign_participants_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proof_submissions" ADD CONSTRAINT "proof_submissions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proof_submissions" ADD CONSTRAINT "proof_submissions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_runs" ADD CONSTRAINT "score_runs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_rows" ADD CONSTRAINT "score_rows_scoreRunId_fkey" FOREIGN KEY ("scoreRunId") REFERENCES "score_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_rows" ADD CONSTRAINT "score_rows_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_rows" ADD CONSTRAINT "score_rows_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yellow_sessions" ADD CONSTRAINT "yellow_sessions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yellow_sessions" ADD CONSTRAINT "yellow_sessions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "micro_rewards" ADD CONSTRAINT "micro_rewards_yellowSessionId_fkey" FOREIGN KEY ("yellowSessionId") REFERENCES "yellow_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "micro_rewards" ADD CONSTRAINT "micro_rewards_proofSubmissionId_fkey" FOREIGN KEY ("proofSubmissionId") REFERENCES "proof_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "erc8004_feedback" ADD CONSTRAINT "erc8004_feedback_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "erc8004_feedback" ADD CONSTRAINT "erc8004_feedback_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
