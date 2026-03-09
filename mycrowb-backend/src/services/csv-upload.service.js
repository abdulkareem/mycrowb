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

async function importShops(filePath) {
  const rows = await parseCsv(filePath);
  let imported = 0;

  for (const row of rows) {
    const user = await prisma.user.upsert({
      where: { mobile: row.mobile },
      update: { name: row.ownerName || 'Owner' },
      create: { mobile: row.mobile, name: row.ownerName || 'Owner', role: 'BARBER' }
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
        buildingNumber: row.buildingNumber
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
        buildingNumber: row.buildingNumber
      }
    });
    imported += 1;
  }

  return { imported, total: rows.length };
}

module.exports = { importShops };
