-- AlterTable
ALTER TABLE "pricing_configs" ADD COLUMN     "distributorMarkupType" TEXT NOT NULL DEFAULT 'percentage',
ADD COLUMN     "platformFeeType" TEXT NOT NULL DEFAULT 'percentage',
ALTER COLUMN "distributorMarkup" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "platformFee" SET DATA TYPE DECIMAL(10,2);
