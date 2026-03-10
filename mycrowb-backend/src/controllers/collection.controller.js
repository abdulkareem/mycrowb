const prisma = require('../config/prisma');
const { generateReceiptPdf } = require('../services/pdf.service');

const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];

function getShopCharges(shop) {
  const tippingFee = Number(shop.tippingFees || 0);
  const gstPercentage = Number(shop.gstPercentage ?? 18);
  const gst = Number(((tippingFee * gstPercentage) / 100).toFixed(2));
  return { tippingFee, gst, total: Number((tippingFee + gst).toFixed(2)) };
}

async function updatePendingMonthsForShop(shopId, year) {
  const paidCount = await prisma.collection.count({
    where: {
      shopId,
      year,
      collected: true
    }
  });

  const pendingMonths = Math.max(0, 12 - paidCount);
  await prisma.barberShop.update({
    where: { id: shopId },
    data: { paymentPendingMonths: pendingMonths }
  });
  return pendingMonths;
}

async function markCollection(req, res, next) {
  try {
    const existing = await prisma.collection.findUnique({
      where: { id: req.params.id },
      include: { shop: true }
    });

    const amount = getShopCharges(existing.shop).total;

    const collection = await prisma.collection.update({
      where: { id: req.params.id },
      data: {
        hairWeight: Number(req.body.hairWeight),
        collected: true,
        status: 'COLLECTED',
        amount,
        collectionDate: new Date(),
        imageProofUrl: req.file ? `/${req.file.path}` : undefined
      }
    });

    await updatePendingMonthsForShop(collection.shopId, collection.year);
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
      include: { shop: true, collector: true }
    });

    const receiptNumber = `R-${Date.now()}`;
    const pdfUrl = await generateReceiptPdf({
      receiptNumber,
      amount: collection.amount,
      paymentDate: new Date(),
      shopName: collection.shop.shopName,
      collectorName: collection.collector?.name,
      collectorMobile: collection.collector?.mobile
    });

    const receipt = await prisma.receipt.upsert({
      where: { collectionId: collection.id },
      update: {
        receiptNumber,
        amount: collection.amount,
        paymentDate: new Date(),
        pdfUrl
      },
      create: {
        collectionId: collection.id,
        receiptNumber,
        amount: collection.amount,
        paymentDate: new Date(),
        pdfUrl
      }
    });

    await updatePendingMonthsForShop(collection.shopId, collection.year);
    res.json({ collection, receipt });
  } catch (error) {
    next(error);
  }
}

async function verifyShopPayment(req, res, next) {
  try {
    const month = Number(req.params.month);
    const year = Number(req.body.year || new Date().getFullYear());

    if (!month || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Invalid month' });
    }

    const collection = await prisma.collection.findFirst({
      where: {
        shopId: req.params.shopId,
        month,
        year,
        collected: true
      },
      include: {
        shop: true,
        collector: true,
        receipt: true
      }
    });

    if (!collection) {
      return res.status(404).json({ message: 'Collected record not found for this month' });
    }

    const { total } = getShopCharges(collection.shop);

    const updatedCollection = await prisma.collection.update({
      where: { id: collection.id },
      data: { paid: true, amount: total }
    });

    const receiptNumber = `R-${Date.now()}-${month}`;
    const paymentDate = new Date();
    const pdfUrl = await generateReceiptPdf({
      receiptNumber,
      amount: total,
      paymentDate,
      shopName: collection.shop.shopName,
      collectorName: collection.collector?.name,
      collectorMobile: collection.collector?.mobile
    });

    const receipt = await prisma.receipt.upsert({
      where: { collectionId: collection.id },
      update: { receiptNumber, amount: total, paymentDate, pdfUrl },
      create: {
        collectionId: collection.id,
        receiptNumber,
        amount: total,
        paymentDate,
        pdfUrl
      }
    });

    const pendingMonths = await updatePendingMonthsForShop(collection.shopId, year);

    return res.json({
      message: 'Payment verified and receipt generated',
      collection: updatedCollection,
      receipt,
      pendingMonths
    });
  } catch (error) {
    return next(error);
  }
}

async function listAdminPayments(req, res, next) {
  try {
    const year = Number(req.query.year || new Date().getFullYear());

    const shops = await prisma.barberShop.findMany({
      orderBy: { shopName: 'asc' }
    });

    const collections = await prisma.collection.findMany({
      where: { year },
      include: {
        receipt: true,
        collector: { select: { id: true, name: true, mobile: true } }
      }
    });

    const byShop = collections.reduce((acc, item) => {
      if (!acc[item.shopId]) acc[item.shopId] = {};
      acc[item.shopId][item.month] = item;
      return acc;
    }, {});

    const rows = await Promise.all(shops.map(async (shop) => {
      const { tippingFee, gst } = getShopCharges(shop);
      const monthMap = {};
      let filledMonthCount = 0;

      MONTHS.forEach((_m, index) => {
        const monthNumber = index + 1;
        const row = byShop[shop.id]?.[monthNumber];
        const isFilled = Boolean(row?.collected);
        if (isFilled) filledMonthCount += 1;
        monthMap[MONTHS[index]] = {
          month: monthNumber,
          collected: isFilled,
          paid: Boolean(row?.paid),
          fee: isFilled ? tippingFee : 0,
          gst: isFilled ? gst : 0,
          receiptUrl: row?.receipt?.pdfUrl || null,
          receiptNumber: row?.receipt?.receiptNumber || null,
          collector: row?.collector || null
        };
      });

      const pendingMonths = Math.max(0, 12 - filledMonthCount);
      await prisma.barberShop.update({
        where: { id: shop.id },
        data: { paymentPendingMonths: pendingMonths }
      });

      return {
        id: shop.id,
        shopRegistrationNumber: shop.shopRegistrationNumber,
        shopName: shop.shopName,
        ownerName: shop.ownerName,
        clusterName: shop.clusterName,
        tippingFee,
        gst,
        pendingMonths,
        collectionFrequency: shop.collectionFrequency,
        months: monthMap
      };
    }));

    return res.json({ year, rows });
  } catch (error) {
    return next(error);
  }
}

async function listMyCollections(req, res, next) {
  try {
    const shop = await prisma.barberShop.findUnique({ where: { ownerId: req.user.sub } });
    if (!shop) return res.status(404).json({ message: 'Shop not found for barber' });

    const collections = await prisma.collection.findMany({
      where: { shopId: shop.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        collector: { select: { name: true } },
        receipt: true
      }
    });

    return res.json(collections);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  markCollection,
  markPayment,
  verifyShopPayment,
  listAdminPayments,
  listMyCollections
};
