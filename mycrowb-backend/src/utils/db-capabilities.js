const prisma = require('../config/prisma');

let shopRegistrationReady;
let loginActivityLocationReady;

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

module.exports = { ensureShopRegistrationNumberColumn, ensureLoginActivityLocationColumns };
