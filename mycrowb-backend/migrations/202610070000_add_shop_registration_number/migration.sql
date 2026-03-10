-- AlterTable
ALTER TABLE "BarberShop"
ADD COLUMN "shopRegistrationNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BarberShop_shopRegistrationNumber_key" ON "BarberShop"("shopRegistrationNumber");
