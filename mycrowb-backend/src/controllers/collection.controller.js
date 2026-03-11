const prisma = require('../config/prisma');
const { generateReceiptPdf } = require('../services/pdf.service');
const { ensureCollectionLocationColumns } = require('../utils/db-capabilities');
const fs = require('fs/promises');

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

async function updatePendingMonthsForShop(shopId) {
  const shop = await prisma.barberShop.findUnique({
    where: { id: shopId },
    select: { joinedDate: true }
  });

  const paidCount = await prisma.collection.count({
    where: {
      shopId,
      collected: true
    }
  });

  const currentDate = new Date();
  const joinedDate = shop?.joinedDate ? new Date(shop.joinedDate) : null;
  const expectedMonths = joinedDate
    ? Math.max(0, (currentDate.getFullYear() - joinedDate.getFullYear()) * 12 + (currentDate.getMonth() - joinedDate.getMonth()) + 1)
    : 12;

  const pendingMonths = Math.max(0, expectedMonths - paidCount);
  await prisma.barberShop.update({
    where: { id: shopId },
    data: { paymentPendingMonths: pendingMonths }
  });
  return pendingMonths;
}

async function markCollection(req, res, next) {
  try {
    await ensureCollectionLocationColumns();

    const existing = await prisma.collection.findUnique({
      where: { id: req.params.id },
      include: { shop: true }
    });

    const { tippingFee, gst, total } = getShopCharges(existing.shop);
    const tippingFeeCollected = req.body.tippingFeeCollected === undefined ? tippingFee : Number(req.body.tippingFeeCollected);
    const gstCollected = req.body.gstCollected === undefined ? gst : Number(req.body.gstCollected);
    const amount = Number((tippingFeeCollected + gstCollected).toFixed(2));

    const collection = await prisma.collection.update({
      where: { id: req.params.id },
      data: {
        hairWeight: Number(req.body.hairWeight),
        collected: true,
        status: 'COLLECTED',
        amount,
        tippingFeeCollected,
        gstCollected,
        collectionDate: req.body.collectionDate ? new Date(req.body.collectionDate) : new Date(),
        paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
        staffLatitude: req.body.staffLatitude === undefined ? undefined : Number(req.body.staffLatitude),
        staffLongitude: req.body.staffLongitude === undefined ? undefined : Number(req.body.staffLongitude),
        imageProofUrl: req.file ? `/${req.file.path}` : undefined
      }
    });

    await updatePendingMonthsForShop(collection.shopId);
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
    const receipt = await prisma.receipt.upsert({
      where: { collectionId: collection.id },
      update: {
        receiptNumber,
        amount: collection.amount,
        paymentDate: new Date(),
        pdfUrl: ''
      },
      create: {
        collectionId: collection.id,
        receiptNumber,
        amount: collection.amount,
        paymentDate: new Date(),
        pdfUrl: ''
      }
    });

    await updatePendingMonthsForShop(collection.shopId);
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
    const receipt = await prisma.receipt.upsert({
      where: { collectionId: collection.id },
      update: { receiptNumber, amount: total, paymentDate, pdfUrl: '' },
      create: {
        collectionId: collection.id,
        receiptNumber,
        amount: total,
        paymentDate,
        pdfUrl: ''
      }
    });

    const pendingMonths = await updatePendingMonthsForShop(collection.shopId);

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


async function markCollectionByShopMonth(req, res, next) {
  try {
    await ensureCollectionLocationColumns();

    const month = Number(req.params.month);
    const year = Number(req.body.year || new Date().getFullYear());

    if (!month || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Invalid month' });
    }

    const shop = await prisma.barberShop.findUnique({ where: { id: req.params.shopId } });
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    const { tippingFee, gst } = getShopCharges(shop);
    const tippingFeeCollected = req.body.tippingFeeCollected === undefined ? tippingFee : Number(req.body.tippingFeeCollected);
    const gstCollected = req.body.gstCollected === undefined ? gst : Number(req.body.gstCollected);
    const amount = Number((tippingFeeCollected + gstCollected).toFixed(2));

    const existing = await prisma.collection.findFirst({
      where: { shopId: req.params.shopId, month, year }
    });

    const payload = {
      collectorId: existing?.collectorId || req.user.sub,
      month,
      year,
      hairWeight: Number(req.body.hairWeight),
      collected: true,
      status: 'COLLECTED',
      amount,
      tippingFeeCollected,
      gstCollected,
      collectionDate: req.body.collectionDate ? new Date(req.body.collectionDate) : new Date(),
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
      staffLatitude: req.body.staffLatitude === undefined ? undefined : Number(req.body.staffLatitude),
      staffLongitude: req.body.staffLongitude === undefined ? undefined : Number(req.body.staffLongitude),
      imageProofUrl: req.file ? `/${req.file.path}` : undefined
    };

    const collection = existing
      ? await prisma.collection.update({ where: { id: existing.id }, data: payload })
      : await prisma.collection.create({ data: { ...payload, shopId: req.params.shopId } });

    await updatePendingMonthsForShop(collection.shopId);
    return res.json(collection);
  } catch (error) {
    return next(error);
  }
}

async function issueReceipt(req, res, next) {
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
    const paymentDate = new Date();
    const receiptNumber = collection.receipt?.receiptNumber || `R-${Date.now()}-${month}`;

    const updatedCollection = await prisma.collection.update({
      where: { id: collection.id },
      data: {
        paid: true,
        amount: total,
        paymentDate
      }
    });

    const receipt = await prisma.receipt.upsert({
      where: { collectionId: collection.id },
      update: { receiptNumber, amount: total, paymentDate, pdfUrl: '' },
      create: {
        collectionId: collection.id,
        receiptNumber,
        amount: total,
        paymentDate,
        pdfUrl: ''
      }
    });

    const pendingMonths = await updatePendingMonthsForShop(collection.shopId);

    return res.json({
      message: 'Receipt issued and saved in database',
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
    const clusterName = req.query.clusterName || undefined;
    const collectorId = req.query.collectorId || undefined;

    const collectionWhere = {
      year,
      ...(collectorId ? { collectorId } : {})
    };

    const shopsWhere = {
      ...(clusterName ? { clusterName } : {})
    };

    const shops = await prisma.barberShop.findMany({
      where: shopsWhere,
      orderBy: { shopName: 'asc' }
    });

    const collections = await prisma.collection.findMany({
      where: collectionWhere,
      include: {
        receipt: true,
        collector: { select: { id: true, name: true, mobile: true } }
      }
    });

    const collectedCounts = await prisma.collection.groupBy({
      by: ['shopId'],
      where: { collected: true },
      _count: { _all: true }
    });

    const collectedCountByShop = collectedCounts.reduce((acc, row) => {
      acc[row.shopId] = row._count._all;
      return acc;
    }, {});

    const allYearCollections = await prisma.collection.findMany({
      where: { year, collected: true, paid: true },
      include: {
        shop: true
      }
    });

    const allShops = await prisma.barberShop.findMany({
      select: { clusterName: true }
    });

    const activeStaffProfiles = await prisma.staffProfile.findMany({
      where: { isActive: true },
      select: { whatsappNumber: true, mobileNumber: true }
    });

    const staffNumbers = [...new Set(
      activeStaffProfiles
        .flatMap((staff) => [staff.whatsappNumber, staff.mobileNumber])
        .filter(Boolean)
    )];

    const staffOptions = await prisma.user.findMany({
      where: {
        role: 'SERVICE_STAFF',
        OR: [
          { staff: { active: true } },
          {
            mobile: {
              in: staffNumbers.length ? staffNumbers : ['__NO_MATCH__']
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        mobile: true
      },
      orderBy: {
        name: 'asc'
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
      let totalFeeCollected = 0;
      let totalGstCollected = 0;

      MONTHS.forEach((_m, index) => {
        const monthNumber = index + 1;
        const row = byShop[shop.id]?.[monthNumber];
        const isFilled = Boolean(row?.collected);
        if (isFilled) filledMonthCount += 1;
        if (isFilled && row?.paid) {
          totalFeeCollected += tippingFee;
          totalGstCollected += gst;
        }
        monthMap[MONTHS[index]] = {
          month: monthNumber,
          collected: isFilled,
          status: row?.status || 'PENDING',
          paid: Boolean(row?.paid),
          fee: isFilled ? tippingFee : 0,
          gst: isFilled ? gst : 0,
          receiptUrl: row?.receipt?.pdfUrl || null,
          receiptNumber: row?.receipt?.receiptNumber || null,
          collector: row?.collector || null
        };
      });

      const joinedDate = shop.joinedDate ? new Date(shop.joinedDate) : null;
      const expectedMonths = joinedDate
        ? Math.max(0, (new Date().getFullYear() - joinedDate.getFullYear()) * 12 + (new Date().getMonth() - joinedDate.getMonth()) + 1)
        : 12;
      const pendingMonths = Math.max(0, expectedMonths - Number(collectedCountByShop[shop.id] || 0));
      await prisma.barberShop.update({
        where: { id: shop.id },
        data: { paymentPendingMonths: pendingMonths }
      });

      return {
        id: shop.id,
        shopRegistrationNumber: shop.shopRegistrationNumber,
        shopName: shop.shopName,
        ownerName: shop.ownerName,
        whatsappNumber: shop.whatsappNumber,
        clusterName: shop.clusterName,
        district: shop.district,
        state: shop.state,
        status: shop.status,
        tippingFee,
        gst,
        collectedMonths: filledMonthCount,
        pendingMonths,
        totalFeeCollected: Number(totalFeeCollected.toFixed(2)),
        totalGstCollected: Number(totalGstCollected.toFixed(2)),
        collectionFrequency: shop.collectionFrequency,
        months: monthMap
      };
    }));

    const monthlyTotals = MONTHS.reduce((acc, monthKey, index) => {
      const month = index + 1;
      let fee = 0;
      let gst = 0;
      rows.forEach((row) => {
        const monthData = row.months?.[monthKey];
        if (monthData?.collected && monthData?.paid) {
          fee += Number(monthData.fee || 0);
          gst += Number(monthData.gst || 0);
        }
      });

      acc[monthKey] = {
        month,
        fee: Number(fee.toFixed(2)),
        gst: Number(gst.toFixed(2)),
        total: Number((fee + gst).toFixed(2))
      };
      return acc;
    }, {});

    const yearlyGrandTotals = allYearCollections.reduce((acc, item) => {
      const charges = getShopCharges(item.shop);
      acc.fee += charges.tippingFee;
      acc.gst += charges.gst;
      return acc;
    }, { fee: 0, gst: 0 });

    const monthlyTotalsAllData = MONTHS.reduce((acc, monthKey, index) => {
      const month = index + 1;
      const monthCollections = allYearCollections.filter((item) => item.month === month);
      const totals = monthCollections.reduce((sum, item) => {
        const charges = getShopCharges(item.shop);
        sum.fee += charges.tippingFee;
        sum.gst += charges.gst;
        return sum;
      }, { fee: 0, gst: 0 });

      acc[monthKey] = {
        month,
        fee: Number(totals.fee.toFixed(2)),
        gst: Number(totals.gst.toFixed(2)),
        total: Number((totals.fee + totals.gst).toFixed(2))
      };
      return acc;
    }, {});

    const clusterOptions = [...new Set(allShops.map((shop) => shop.clusterName).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    return res.json({
      year,
      rows,
      filters: {
        selectedClusterName: clusterName || '',
        selectedCollectorId: collectorId || '',
        clusterOptions,
        staffOptions
      },
      summary: {
        monthlyTotals,
        monthlyTotalsAllData,
        yearlyGrandTotals: {
          fee: Number(yearlyGrandTotals.fee.toFixed(2)),
          gst: Number(yearlyGrandTotals.gst.toFixed(2)),
          total: Number((yearlyGrandTotals.fee + yearlyGrandTotals.gst).toFixed(2))
        }
      }
    });
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

async function downloadMyReceipt(req, res, next) {
  let tempPath;
  try {
    const collection = await prisma.collection.findFirst({
      where: { id: req.params.id, paid: true, shop: { ownerId: req.user.sub } },
      include: { shop: true, collector: true, receipt: true }
    });

    if (!collection || !collection.receipt?.receiptNumber) {
      return res.status(404).json({ message: 'Receipt not found for this collection.' });
    }

    tempPath = await generateReceiptPdf({
      receiptNumber: collection.receipt.receiptNumber,
      amount: Number(collection.amount || collection.receipt.amount || 0),
      paymentDate: collection.paymentDate || collection.receipt.paymentDate || new Date(),
      shopName: collection.shop.shopName,
      collectorName: collection.collector?.name,
      collectorMobile: collection.collector?.mobile,
      persist: false
    });

    return res.download(tempPath, `${collection.receipt.receiptNumber}.pdf`, async () => {
      await fs.unlink(tempPath).catch(() => undefined);
    });
  } catch (error) {
    if (tempPath) await fs.unlink(tempPath).catch(() => undefined);
    return next(error);
  }
}

module.exports = {
  markCollection,
  markPayment,
  verifyShopPayment,
  markCollectionByShopMonth,
  issueReceipt,
  listAdminPayments,
  listMyCollections,
  downloadMyReceipt
};
