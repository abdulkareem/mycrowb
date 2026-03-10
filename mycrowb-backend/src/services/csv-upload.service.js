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

    await prisma.barberShop.upsert({
      where: { ownerId: user.id },
      update: {
        shopName: row.shopName,
        address: row.address,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        district: row.district || row.city,
        state: row.state,
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
        district: row.district || row.city,
        state: row.state,
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
