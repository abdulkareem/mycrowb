-- AlterTable
ALTER TABLE "BarberShop"
ADD COLUMN "joinedDate" TIMESTAMP(3),
ADD COLUMN "tippingFees" DOUBLE PRECISION,
ADD COLUMN "paymentPendingMonths" INTEGER;
