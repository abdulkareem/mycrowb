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

async function trends(_req, res, next) {
  try {
    const analytics = await prisma.analytics.findMany({ orderBy: [{ year: 'asc' }, { month: 'asc' }] });
    res.json(analytics);
  } catch (error) {
    next(error);
  }
}

module.exports = { monthlySummary, trends };
