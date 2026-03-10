-- CreateEnum
CREATE TYPE "ShopCategory" AS ENUM ('GENTS_BARBER_SHOP_SALOON', 'LADY_BEAUTY_PARLOUR', 'MIXED_LARGE_CORPORATE');

-- AlterTable
ALTER TABLE "BarberShop"
ADD COLUMN "category" "ShopCategory",
ADD COLUMN "clusterName" TEXT;
