const fs = require('fs');
const { parse } = require('csv-parse');
const prisma = require('../config/prisma');

function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, trim: true }))
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

function validateRequiredCsvField(row, field) {
  return row[field] !== undefined && row[field] !== null && `${row[field]}`.trim() !== '';
}

function getShopRegistrationPrefix(value) {
  const cleaned = `${value || ''}`.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return (cleaned.slice(0, 2) || 'XX').padEnd(2, 'X');
}

function generateShopRegistrationNumber(state, district) {
  const randomDigits = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${getShopRegistrationPrefix(state)}${getShopRegistrationPrefix(district)}${randomDigits}`;
}

async function createUniqueShopRegistrationNumber(state, district) {
  for (let attempts = 0; attempts < 10; attempts += 1) {
    const shopRegistrationNumber = generateShopRegistrationNumber(state, district);
    const existingShop = await prisma.barberShop.findUnique({ where: { shopRegistrationNumber } });

    if (!existingShop) {
      return shopRegistrationNumber;
    }
  }

  throw new Error('Unable to generate unique shop registration number');
}

async function importShops(filePath) {
  const rows = await parseCsv(filePath);
  let imported = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const requiredFields = ['mobile', 'ownerName'];
    const missingField = requiredFields.find((field) => !validateRequiredCsvField(row, field));
    if (missingField) {
      const error = new Error(`Row ${index + 2}: ${missingField} is required`);
      error.status = 400;
      throw error;
    }

    const user = await prisma.user.upsert({
      where: { mobile: row.mobile },
      update: { name: row.ownerName },
      create: { mobile: row.mobile, name: row.ownerName, role: 'BARBER' }
    });

    const district = row.district || row.city || '';
    const state = row.state || '';
    const existingShop = await prisma.barberShop.findUnique({ where: { ownerId: user.id } });
    const shopRegistrationNumber = existingShop?.shopRegistrationNumber || await createUniqueShopRegistrationNumber(state, district);

    await prisma.barberShop.upsert({
      where: { ownerId: user.id },
      update: {
        shopName: row.shopName,
        address: row.address,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        district,
        state,
        shopRegistrationNumber,
        joinedDate: new Date(),
        roomNumber: row.roomNumber,
        buildingNumber: row.buildingNumber,
        place: row.place
      },
      create: {
        ownerId: user.id,
        shopName: row.shopName,
        address: row.address,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        district,
        state,
        shopRegistrationNumber,
        joinedDate: new Date(),
        roomNumber: row.roomNumber,
        buildingNumber: row.buildingNumber,
        place: row.place
      }
    });
    imported += 1;
  }

  return { imported, total: rows.length };
}

module.exports = { importShops };
