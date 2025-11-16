-- CreateTable
CREATE TABLE "affiliate_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tier" TEXT NOT NULL DEFAULT 'bronze',
    "totalEarnings" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "pendingBalance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "paidBalance" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "activeReferrals" INTEGER NOT NULL DEFAULT 0,
    "applicationNote" TEXT,
    "rejectionReason" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_profiles_userId_key" ON "affiliate_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_profiles_referralCode_key" ON "affiliate_profiles"("referralCode");

-- CreateIndex
CREATE INDEX "affiliate_profiles_userId_idx" ON "affiliate_profiles"("userId");

-- CreateIndex
CREATE INDEX "affiliate_profiles_referralCode_idx" ON "affiliate_profiles"("referralCode");

-- CreateIndex
CREATE INDEX "affiliate_profiles_status_idx" ON "affiliate_profiles"("status");

-- AddForeignKey
ALTER TABLE "affiliate_profiles" ADD CONSTRAINT "affiliate_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
