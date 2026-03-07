const prisma = require('../config/prisma');
const { predictNextMonth } = require('../services/prediction.service');

async function predictShop(req, res, next) {
  try {
    const prediction = await predictNextMonth(req.body);
    const saved = await prisma.prediction.create({
      data: {
        shopId: req.body.shopId,
        predictedHairNextMonth: prediction.predicted_hair_next_month,
        modelVersion: prediction.model_version
      }
    });
    res.json(saved);
  } catch (error) {
    next(error);
  }
}

module.exports = { predictShop };
