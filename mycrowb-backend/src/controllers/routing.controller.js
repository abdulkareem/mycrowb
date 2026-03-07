const prisma = require('../config/prisma');
const { optimizeRoute } = require('../services/route-optimizer.service');

async function getOptimizedRoute(req, res, next) {
  try {
    const shops = await prisma.barberShop.findMany({
      where: { city: req.query.city, status: 'ACTIVE' },
      select: { id: true, shopName: true, latitude: true, longitude: true, address: true }
    });
    const route = await optimizeRoute(shops);
    res.json(route);
  } catch (error) {
    next(error);
  }
}

module.exports = { getOptimizedRoute };
