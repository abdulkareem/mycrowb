const fs = require('fs');
const { parse } = require('csv-parse');
const prisma = require('../config/prisma');
const { ensureShopRegistrationNumberColumn } = require('../utils/db-capabilities');

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
  await ensureShopRegistrationNumberColumn();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const requiredFields = ['ownerName', 'whatsappNumber', 'shopName'];
    const missingField = requiredFields.find((field) => !validateRequiredCsvField(row, field));
    if (missingField) {
      const error = new Error(`Row ${index + 2}: ${missingField} is required`);
      error.status = 400;
      throw error;
    }

    const whatsappNumber = `${row.whatsappNumber}`.trim();

    const user = await prisma.user.upsert({
      where: { mobile: whatsappNumber },
      update: { name: row.ownerName },
      create: { mobile: whatsappNumber, name: row.ownerName, role: 'BARBER' }
    });

    const district = row.district || row.city || '';
    const state = row.state || '';
    const existingShop = await prisma.barberShop.findUnique({ where: { ownerId: user.id } });
    const shopRegistrationNumber = existingShop?.shopRegistrationNumber || await createUniqueShopRegistrationNumber(state, district);

    const baseData = {
      shopName: row.shopName,
      ownerName: row.ownerName,
      whatsappNumber,
      address: row.address || '',
      latitude: validateRequiredCsvField(row, 'latitude') ? Number(row.latitude) : 0,
      longitude: validateRequiredCsvField(row, 'longitude') ? Number(row.longitude) : 0,
      district: district || '',
      state: state || '',
      joinedDate: new Date(),
      roomNumber: row.roomNumber,
      buildingNumber: row.buildingNumber,
      place: row.place
    };

    const data = { ...baseData, shopRegistrationNumber };

    await prisma.barberShop.upsert({
      where: { ownerId: user.id },
      update: data,
      create: {
        ownerId: user.id,
        ...data
      }
    });
    imported += 1;
  }

  return { imported, total: rows.length };
}

module.exports = { importShops };
