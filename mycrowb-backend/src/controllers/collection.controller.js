const prisma = require('../config/prisma');
const { generateReceiptPdf } = require('../services/pdf.service');

async function markCollection(req, res, next) {
  try {
    const collection = await prisma.collection.update({
      where: { id: req.params.id },
      data: {
        hairWeight: Number(req.body.hairWeight),
        collected: true,
        status: 'COLLECTED',
        collectionDate: new Date(),
        imageProofUrl: req.file ? `/${req.file.path}` : undefined
      }
    });
    res.json(collection);
  } catch (error) {
    next(error);
  }
}

async function markPayment(req, res, next) {
  try {
    const collection = await prisma.collection.update({
      where: { id: req.params.id },
      data: { paid: true, amount: Number(req.body.amount) },
      include: { shop: true }
    });

    const receiptNumber = `R-${Date.now()}`;
    const pdfUrl = await generateReceiptPdf({
      receiptNumber,
      amount: collection.amount,
      paymentDate: new Date(),
      shopName: collection.shop.shopName
    });

    const receipt = await prisma.receipt.create({
      data: {
        collectionId: collection.id,
        receiptNumber,
        amount: collection.amount,
        paymentDate: new Date(),
        pdfUrl
      }
    });

    res.json({ collection, receipt });
  } catch (error) {
    next(error);
  }
}

module.exports = { markCollection, markPayment };
