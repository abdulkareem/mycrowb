const XLSX = require('xlsx');
const prisma = require('../config/prisma');
const { importShops } = require('../services/csv-upload.service');
const { ensureShopRegistrationNumberColumn } = require('../utils/db-capabilities');

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
    await ensureShopRegistrationNumberColumn();
    const sortField = req.query.sortField;
    const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';
    const sortableFields = [
      'shopName',
      'ownerName',
      'category',
      'clusterName',
      'roomNumber',
      'buildingNumber',
      'wardNumber',
      'localBody',
      'place',
      'address',
      'district',
      'shopRegistrationNumber',
      'registeredAssociationName',
      'state',
      'whatsappNumber',
      'employeeCount',
      'chairCount',
      'latitude',
      'longitude',
      'status',
      'joinedDate',
      'tippingFees',
      'gstPercentage',
      'collectionFrequency',
      'paymentPendingMonths'
    ];

    const orderBy = sortableFields.includes(sortField)
      ? { [sortField]: sortOrder }
      : { shopName: 'asc' };


    const where = {};
    if (req.query.clusterName) where.clusterName = req.query.clusterName;
    if (req.query.place) where.place = req.query.place;
    if (req.query.localBody) where.localBody = req.query.localBody;
    if (req.query.status && ['ACTIVE', 'INACTIVE'].includes(req.query.status)) where.status = req.query.status;

    const shops = await prisma.barberShop.findMany({
      where,
      include: {
        owner: true,
        certificates: {
          orderBy: { issueDate: 'desc' },
          take: 1
        }
      },
      orderBy
    });
    res.json(shops);
  } catch (error) {
    next(error);
  }
}

async function exportShops(req, res, next) {
  try {
    await ensureShopRegistrationNumberColumn();
    const where = {};

    if (req.query.clusterName) where.clusterName = req.query.clusterName;
    if (req.query.place) where.place = req.query.place;
    if (req.query.localBody) where.localBody = req.query.localBody;
    if (req.query.status && ['ACTIVE', 'INACTIVE'].includes(req.query.status)) {
      where.status = req.query.status;
    }

    const shops = await prisma.barberShop.findMany({
      where,
      include: {
        owner: true,
        certificates: {
          orderBy: { issueDate: 'desc' },
          take: 1
        }
      },
      orderBy: { shopName: 'asc' }
    });

    const rows = shops.map((shop) => ({
      'Shop Name': shop.shopName,
      'Owner Name': shop.ownerName || shop.owner?.name || '',
      Category: shop.category || '',
      'Cluster Name': shop.clusterName || '',
      'Room No': shop.roomNumber || '',
      'Building No': shop.buildingNumber || '',
      'Ward No': shop.wardNumber || '',
      'Local Body': shop.localBody || '',
      Place: shop.place || '',
      Address: shop.address || '',
      District: shop.district || '',
      'Shop Registration Number': shop.shopRegistrationNumber || '',
      Association: shop.registeredAssociationName || '',
      State: shop.state || '',
      WhatsApp: shop.whatsappNumber || '',
      Employees: shop.employeeCount ?? '',
      Chairs: shop.chairCount ?? '',
      Latitude: shop.latitude ?? '',
      Longitude: shop.longitude ?? '',
      Status: shop.status,
      'Joined Date': shop.joinedDate ? new Date(shop.joinedDate).toISOString().slice(0, 10) : '',
      'Tipping Fees': shop.tippingFees ?? '',
      'GST Percentage': shop.gstPercentage ?? '',
      'Collection Frequency': shop.collectionFrequency ?? '',
      'Payment Pending Months': shop.paymentPendingMonths ?? '',
      'Certificate Code': shop.certificates[0]?.certificateCode || ''
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registered Shops');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="registered-shops.xlsx"');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

async function updateShop(req, res, next) {
  try {
    await ensureShopRegistrationNumberColumn();
    const allowedFields = [
      'shopName', 'ownerName', 'category', 'clusterName', 'roomNumber', 'buildingNumber', 'wardNumber',
      'localBody', 'place', 'address', 'district', 'registeredAssociationName', 'state', 'whatsappNumber',
      'employeeCount', 'chairCount', 'latitude', 'longitude', 'joinedDate', 'tippingFees', 'gstPercentage', 'collectionFrequency', 'paymentPendingMonths'
    ];

    const data = {};
    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        data[field] = req.body[field];
      }
    });

    ['employeeCount', 'chairCount', 'paymentPendingMonths'].forEach((field) => {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        data[field] = Number(data[field]);
      }
    });

    ['latitude', 'longitude', 'tippingFees', 'gstPercentage'].forEach((field) => {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        data[field] = Number(data[field]);
      }
    });

    if (data.joinedDate) {
      data.joinedDate = new Date(data.joinedDate);
    }

    const shop = await prisma.barberShop.update({ where: { id: req.params.id }, data });
    res.json(shop);
  } catch (error) {
    next(error);
  }
}

async function toggleShop(req, res, next) {
  try {
    await ensureShopRegistrationNumberColumn();
    const shop = await prisma.barberShop.update({
      where: { id: req.params.id },
      data: { status: req.body.active ? 'ACTIVE' : 'INACTIVE' }
    });
    res.json(shop);
  } catch (error) {
    next(error);
  }
}

async function deleteShop(req, res, next) {
  try {
    await ensureShopRegistrationNumberColumn();
    await prisma.$transaction(async (tx) => {
      const collections = await tx.collection.findMany({
        where: { shopId: req.params.id },
        select: { id: true }
      });

      if (collections.length) {
        await tx.receipt.deleteMany({
          where: { collectionId: { in: collections.map((item) => item.id) } }
        });
      }

      await tx.collection.deleteMany({ where: { shopId: req.params.id } });
      await tx.certificate.deleteMany({ where: { shopId: req.params.id } });
      await tx.rating.deleteMany({ where: { shopId: req.params.id } });
      await tx.prediction.deleteMany({ where: { shopId: req.params.id } });
      await tx.barberShop.delete({ where: { id: req.params.id } });
    });

    res.json({ message: 'Shop deleted successfully' });
  } catch (error) {
    next(error);
  }
}

async function getMyShop(req, res, next) {
  try {
    await ensureShopRegistrationNumberColumn();
    const shop = await prisma.barberShop.findUnique({
      where: { ownerId: req.user.sub },
      include: { owner: true }
    });
    if (!shop) return res.status(404).json({ message: 'Shop profile not found' });
    return res.json(shop);
  } catch (error) {
    next(error);
  }
}

async function updateMyShopProfile(req, res, next) {
  try {
    await ensureShopRegistrationNumberColumn();
    const existingShop = await prisma.barberShop.findUnique({ where: { ownerId: req.user.sub } });

    if (existingShop?.profileLocked && !existingShop.editApproved) {
      return res.status(403).json({ message: 'Profile is locked. Request admin approval to edit.' });
    }


    const requiredFields = [
      'shopName',
      'ownerName',
      'roomNumber',
      'buildingNumber',
      'wardNumber',
      'localBody',
      'place',
      'address',
      'district',
      'registeredAssociationName',
      'category',
      'clusterName',
      'state',
      'latitude',
      'longitude',
      'whatsappNumber',
      'employeeCount',
      'chairCount'
    ];

    const missingField = requiredFields.find((field) => req.body[field] === undefined || req.body[field] === null || `${req.body[field]}`.trim() === '');
    if (missingField) {
      return res.status(400).json({ message: `${missingField} is required` });
    }

    const data = {
      shopName: req.body.shopName,
      roomNumber: req.body.roomNumber,
      buildingNumber: req.body.buildingNumber,
      wardNumber: req.body.wardNumber,
      localBody: req.body.localBody,
      place: req.body.place,
      address: req.body.address,
      district: req.body.district,
      registeredAssociationName: req.body.registeredAssociationName,
      category: req.body.category,
      clusterName: req.body.clusterName,
      state: req.body.state,
      latitude: req.body.latitude === undefined ? undefined : Number(req.body.latitude),
      longitude: req.body.longitude === undefined ? undefined : Number(req.body.longitude),
      whatsappNumber: req.body.whatsappNumber,
      ownerName: req.body.ownerName,
      employeeCount: req.body.employeeCount === undefined ? undefined : Number(req.body.employeeCount),
      chairCount: req.body.chairCount === undefined ? undefined : Number(req.body.chairCount),
      profileLocked: true,
      editApproved: false,
      editRequestPending: false
    };

    if (req.body.ownerName) {
      await prisma.user.update({ where: { id: req.user.sub }, data: { name: req.body.ownerName } });
    }

    const shop = await prisma.barberShop.upsert({
      where: { ownerId: req.user.sub },
      update: data,
      create: {
        ownerId: req.user.sub,
        ...data,
        latitude: Number(req.body.latitude ?? 0),
        longitude: Number(req.body.longitude ?? 0),
        shopName: req.body.shopName || 'Barber Shop',
        address: req.body.address || '',
        district: req.body.district || '',
        registeredAssociationName: req.body.registeredAssociationName || null,
        category: req.body.category || null,
        clusterName: req.body.clusterName || null,
        state: req.body.state || ''
      }
    });

    return res.json(shop);
  } catch (error) {
    next(error);
  }
}

async function requestProfileEdit(req, res, next) {
  try {
    const shop = await prisma.barberShop.update({
      where: { ownerId: req.user.sub },
      data: {
        editRequestPending: true,
        editApproved: false
      }
    });

    res.json({
      message: 'Edit request sent to admin',
      notification: `Admin notification: Edit requested by ${shop.shopName}`,
      shop
    });
  } catch (error) {
    next(error);
  }
}

async function setProfileEditApproval(req, res, next) {
  try {
    const approved = Boolean(req.body.approved);
    const shop = await prisma.barberShop.update({
      where: { id: req.params.id },
      data: {
        profileLocked: !approved,
        editApproved: approved,
        editRequestPending: false
      }
    });

    res.json({
      message: approved ? 'Edit request approved' : 'Edit request rejected',
      shop
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadShopsCsv,
  listShops,
  exportShops,
  updateShop,
  toggleShop,
  deleteShop,
  getMyShop,
  updateMyShopProfile,
  requestProfileEdit,
  setProfileEditApproval
};
