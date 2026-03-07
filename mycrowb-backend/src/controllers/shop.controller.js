const prisma = require('../config/prisma');
const { importShops } = require('../services/csv-upload.service');

async function uploadShopsCsv(req, res, next) {
  try {
    const result = await importShops(req.file.path);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function listShops(req, res, next) {
  try {
    const shops = await prisma.barberShop.findMany({ include: { owner: true } });
    res.json(shops);
  } catch (error) {
    next(error);
  }
}

async function updateShop(req, res, next) {
  try {
    const shop = await prisma.barberShop.update({ where: { id: req.params.id }, data: req.body });
    res.json(shop);
  } catch (error) {
    next(error);
  }
}

async function toggleShop(req, res, next) {
  try {
    const shop = await prisma.barberShop.update({
      where: { id: req.params.id },
      data: { status: req.body.active ? 'ACTIVE' : 'INACTIVE' }
    });
    res.json(shop);
  } catch (error) {
    next(error);
  }
}

module.exports = { uploadShopsCsv, listShops, updateShop, toggleShop };
