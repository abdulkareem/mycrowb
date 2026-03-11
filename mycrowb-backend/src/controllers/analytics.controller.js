const prisma = require('../config/prisma');

async function monthlySummary(req, res, next) {
  try {
    const { month, year } = req.query;
    const collections = await prisma.collection.findMany({
      where: { month: Number(month), year: Number(year), collected: true }
    });
    const revenue = collections.reduce((sum, c) => sum + c.amount, 0);
    const hair = collections.reduce((sum, c) => sum + c.hairWeight, 0);
    const activeShops = new Set(collections.map((c) => c.shopId)).size;

    res.json({ month: Number(month), year: Number(year), hair, revenue, activeShops });
  } catch (error) {
    next(error);
  }
}

function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

async function trends(_req, res, next) {
  try {
    const [collections, certificates, shops] = await Promise.all([
      prisma.collection.findMany({
        where: { collected: true },
        select: { month: true, year: true, amount: true, hairWeight: true, shopId: true }
      }),
      prisma.certificate.findMany({
        select: { issueDate: true }
      }),
      prisma.barberShop.findMany({
        select: { id: true, status: true, registrationDate: true }
      })
    ]);

    const monthlyMap = new Map();

    collections.forEach((collection) => {
      const key = monthKey(collection.year, collection.month);
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          year: collection.year,
          month: collection.month,
          totalHairCollected: 0,
          revenue: 0,
          certificatesIssued: 0
        });
      }

      const current = monthlyMap.get(key);
      current.totalHairCollected += collection.hairWeight;
      current.revenue += collection.amount;
    });

    certificates.forEach((certificate) => {
      const issueDate = new Date(certificate.issueDate);
      const month = issueDate.getUTCMonth() + 1;
      const year = issueDate.getUTCFullYear();
      const key = monthKey(year, month);

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          year,
          month,
          totalHairCollected: 0,
          revenue: 0,
          certificatesIssued: 0
        });
      }

      const current = monthlyMap.get(key);
      current.certificatesIssued += 1;
    });

    const analytics = Array.from(monthlyMap.values())
      .sort((a, b) => (a.year - b.year) || (a.month - b.month))
      .map((entry) => {
        const monthEnd = new Date(Date.UTC(entry.year, entry.month, 0, 23, 59, 59, 999));
        const activeShops = shops.filter((shop) => (
          shop.status === 'ACTIVE'
          && new Date(shop.registrationDate) <= monthEnd
        )).length;

        return {
          year: entry.year,
          month: entry.month,
          totalHairCollected: Number(entry.totalHairCollected.toFixed(2)),
          revenue: Number(entry.revenue.toFixed(2)),
          activeShops,
          certificatesIssued: entry.certificatesIssued
        };
      });

    res.json(analytics);
  } catch (error) {
    next(error);
  }
}

module.exports = { monthlySummary, trends };
