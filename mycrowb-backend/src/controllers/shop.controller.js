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
    const sortField = req.query.sortField;
    const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';
    const sortableFields = [
      'shopName',
      'ownerName',
      'category',
      'clusterName',
      'place',
      'district',
      'state',
      'status',
      'registeredAssociationName',
      'localBody'
    ];

    const orderBy = sortableFields.includes(sortField)
      ? { [sortField]: sortOrder }
      : { shopName: 'asc' };

    const shops = await prisma.barberShop.findMany({
      include: { owner: true },
      orderBy
    });
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

async function getMyShop(req, res, next) {
  try {
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
  updateShop,
  toggleShop,
  getMyShop,
  updateMyShopProfile,
  requestProfileEdit,
  setProfileEditApproval
};
