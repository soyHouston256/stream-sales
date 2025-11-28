-- AlterTable
ALTER TABLE "affiliations" ADD COLUMN     "approvalFee" DECIMAL(19,4),
ADD COLUMN     "approvalStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "approvalTransactionId" TEXT,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "referral_approval_configs" (
    "id" TEXT NOT NULL,
    "approvalFee" DECIMAL(19,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_approval_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "referral_approval_configs_isActive_idx" ON "referral_approval_configs"("isActive");

-- CreateIndex
CREATE INDEX "affiliations_approvalStatus_idx" ON "affiliations"("approvalStatus");
