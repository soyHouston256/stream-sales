-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "basePrice" DECIMAL(10,2),
ADD COLUMN     "unitPrice" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "distributorMarkupAmount" DECIMAL(10,2),
ADD COLUMN     "distributorMarkupRate" DECIMAL(10,2),
ADD COLUMN     "distributorMarkupType" TEXT DEFAULT 'percentage',
ADD COLUMN     "platformFeeAmount" DECIMAL(10,2),
ADD COLUMN     "platformFeeRate" DECIMAL(10,2),
ADD COLUMN     "platformFeeType" TEXT DEFAULT 'percentage';

-- AlterTable
ALTER TABLE "recharges" ADD COLUMN     "exchangeRate" DECIMAL(18,6),
ADD COLUMN     "localAmount" DECIMAL(19,4),
ADD COLUMN     "localCurrency" TEXT DEFAULT 'USD';
