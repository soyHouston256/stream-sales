/*
  Warnings:

  - You are about to drop the column `accountDetails` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `accountEmail` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `accountPassword` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `soldAt` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `purchases` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "disputes" DROP CONSTRAINT "disputes_purchaseId_fkey";

-- DropForeignKey
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_productId_fkey";

-- DropForeignKey
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_providerId_fkey";

-- DropForeignKey
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_sellerId_fkey";

-- DropIndex
DROP INDEX "products_status_idx";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "accountDetails",
DROP COLUMN "accountEmail",
DROP COLUMN "accountPassword",
DROP COLUMN "price",
DROP COLUMN "soldAt",
DROP COLUMN "status",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "description" DROP NOT NULL;

-- DropTable
DROP TABLE "purchases";

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "durationDays" INTEGER,
    "isRenewable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_accounts" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "totalSlots" INTEGER NOT NULL DEFAULT 1,
    "availableSlots" INTEGER NOT NULL DEFAULT 1,
    "platformType" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),

    CONSTRAINT "inventory_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_slots" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "profileName" TEXT,
    "pinCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',

    CONSTRAINT "inventory_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_licenses" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "activationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',

    CONSTRAINT "inventory_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_content" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "resourceUrl" TEXT,
    "liveDate" TIMESTAMP(3),
    "coverImageUrl" TEXT,

    CONSTRAINT "digital_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "assignedSlotId" TEXT,
    "assignedLicenseId" TEXT,
    "assignedContentId" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");

-- CreateIndex
CREATE INDEX "inventory_accounts_productId_idx" ON "inventory_accounts"("productId");

-- CreateIndex
CREATE INDEX "inventory_slots_accountId_idx" ON "inventory_slots"("accountId");

-- CreateIndex
CREATE INDEX "inventory_licenses_productId_idx" ON "inventory_licenses"("productId");

-- CreateIndex
CREATE INDEX "digital_content_productId_idx" ON "digital_content"("productId");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_assignedSlotId_key" ON "order_items"("assignedSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_assignedLicenseId_key" ON "order_items"("assignedLicenseId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_accounts" ADD CONSTRAINT "inventory_accounts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_slots" ADD CONSTRAINT "inventory_slots_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "inventory_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_licenses" ADD CONSTRAINT "inventory_licenses_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_content" ADD CONSTRAINT "digital_content_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_assignedSlotId_fkey" FOREIGN KEY ("assignedSlotId") REFERENCES "inventory_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_assignedLicenseId_fkey" FOREIGN KEY ("assignedLicenseId") REFERENCES "inventory_licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_assignedContentId_fkey" FOREIGN KEY ("assignedContentId") REFERENCES "digital_content"("id") ON DELETE SET NULL ON UPDATE CASCADE;
