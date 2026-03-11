const fs = require('fs');
const path = require('path');
const prisma = require('../config/prisma');

const MIN_PHOTO_SIZE = 1 * 1024;
const MAX_PHOTO_SIZE = 200 * 1024;

function serializeStaff(staff) {
  return {
    ...staff,
    commissionPerShop: Number(staff.commissionPerShop),
    salaryPerMonth: Number(staff.salaryPerMonth)
  };
}

function removeFileSafe(filePath) {
  if (!filePath) return;
  const resolvedPath = path.resolve(filePath);
  if (fs.existsSync(resolvedPath)) {
    fs.unlinkSync(resolvedPath);
  }
}

async function listStaff(_req, res, next) {
  try {
    const staff = await prisma.staffProfile.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(staff.map(serializeStaff));
  } catch (error) {
    next(error);
  }
}

async function createStaff(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Photo is required.' });
    }
    if (req.file.size < MIN_PHOTO_SIZE || req.file.size > MAX_PHOTO_SIZE) {
      removeFileSafe(req.file.path);
      return res.status(400).json({ message: 'Photo size must be between 1KB and 200KB.' });
    }

    const requiredFields = [
      'name', 'address', 'whatsappNumber', 'mobileNumber', 'aadhaarNumber',
      'vehicleNumber', 'staffIdNumber', 'commissionPerShop', 'salaryPerMonth'
    ];

    const missingField = requiredFields.find((field) => !req.body[field]);
    if (missingField) {
      removeFileSafe(req.file.path);
      return res.status(400).json({ message: `${missingField} is required.` });
    }

    const created = await prisma.staffProfile.create({
      data: {
        photoUrl: `/${req.file.path.replace(/\\/g, '/')}`,
        name: req.body.name,
        address: req.body.address,
        whatsappNumber: req.body.whatsappNumber,
        mobileNumber: req.body.mobileNumber,
        aadhaarNumber: req.body.aadhaarNumber,
        vehicleNumber: req.body.vehicleNumber,
        clustersAllotted: req.body.clustersAllotted || '',
        staffIdNumber: req.body.staffIdNumber,
        commissionPerShop: Number(req.body.commissionPerShop),
        salaryPerMonth: Number(req.body.salaryPerMonth)
      }
    });

    res.status(201).json(serializeStaff(created));
  } catch (error) {
    if (req.file?.path) removeFileSafe(req.file.path);
    next(error);
  }
}

async function toggleStaffStatus(req, res, next) {
  try {
    const staff = await prisma.staffProfile.findUnique({ where: { id: req.params.id } });
    if (!staff) return res.status(404).json({ message: 'Staff not found.' });

    const updated = await prisma.staffProfile.update({
      where: { id: req.params.id },
      data: { isActive: !staff.isActive }
    });

    res.json(serializeStaff(updated));
  } catch (error) {
    next(error);
  }
}

async function deleteStaff(req, res, next) {
  try {
    const staff = await prisma.staffProfile.delete({ where: { id: req.params.id } });
    removeFileSafe(staff.photoUrl.startsWith('/') ? staff.photoUrl.slice(1) : staff.photoUrl);
    res.json({ message: 'Staff deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listStaff,
  createStaff,
  toggleStaffStatus,
  deleteStaff
};
