const prisma = require('../config/prisma');

let shopRegistrationReady;
let loginActivityLocationReady;
let collectionLocationReady;

async function ensureShopRegistrationNumberColumn() {
  if (shopRegistrationReady) {
    return;
  }

  await prisma.$executeRawUnsafe('ALTER TABLE "BarberShop" ADD COLUMN IF NOT EXISTS "shopRegistrationNumber" TEXT');
  try {
    await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "BarberShop_shopRegistrationNumber_key" ON "BarberShop"("shopRegistrationNumber")');
  } catch (_error) {
    // Existing duplicate registration numbers should not prevent reads from loading.
  }

  shopRegistrationReady = true;
}

async function ensureLoginActivityLocationColumns() {
  if (loginActivityLocationReady) return;

  await prisma.$executeRawUnsafe('ALTER TABLE "LoginActivity" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION');
  await prisma.$executeRawUnsafe('ALTER TABLE "LoginActivity" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION');
  await prisma.$executeRawUnsafe('ALTER TABLE "LoginActivity" ADD COLUMN IF NOT EXISTS "locationLabel" TEXT');

  loginActivityLocationReady = true;
}

async function ensureCollectionLocationColumns() {
  if (collectionLocationReady) return;

  await prisma.$executeRawUnsafe('ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "staffLatitude" DOUBLE PRECISION');
  await prisma.$executeRawUnsafe('ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "staffLongitude" DOUBLE PRECISION');

  collectionLocationReady = true;
}

module.exports = {
  ensureShopRegistrationNumberColumn,
  ensureLoginActivityLocationColumns,
  ensureCollectionLocationColumns
};
