const prisma = require('../config/prisma');

async function createRating(req, res, next) {
  try {
    const rating = await prisma.rating.create({ data: req.body });
    res.status(201).json(rating);
  } catch (error) {
    next(error);
  }
}

async function listRatings(_req, res, next) {
  try {
    const ratings = await prisma.rating.findMany({ include: { shop: true, collector: true } });
    res.json(ratings);
  } catch (error) {
    next(error);
  }
}

module.exports = { createRating, listRatings };
