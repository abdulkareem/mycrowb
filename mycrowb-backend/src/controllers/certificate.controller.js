const fs = require('fs/promises');
const prisma = require('../config/prisma');
const { appBaseUrl } = require('../config/env');
const { generateCertificatePdf } = require('../services/pdf.service');

function randomAlphaNumeric(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let value = '';

  for (let i = 0; i < length; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }

  return value;
}

function buildShopCertificateCode(shopId) {
  const normalizedShop = shopId.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return `MC-${normalizedShop.slice(-6)}-${randomAlphaNumeric(8)}`;
}

async function createUniqueCertificateCode(shopId) {
  let code = buildShopCertificateCode(shopId);

  // eslint-disable-next-line no-await-in-loop
  while (await prisma.certificate.findUnique({ where: { certificateCode: code } })) {
    code = buildShopCertificateCode(shopId);
  }

  return code;
}

async function issueCertificate(req, res, next) {
  try {
    const shop = await prisma.barberShop.findUniqueOrThrow({
      where: { id: req.body.shopId },
      include: { owner: true }
    });
    const code = await createUniqueCertificateCode(shop.id);
    const verifyUrl = `${appBaseUrl}/api/v1/certificates/verify/${code}`;

    const cert = await prisma.certificate.create({
      data: {
        shopId: req.body.shopId,
        certificateCode: code,
        certificateType: req.body.certificateType || 'MONTHLY',
        issueDate: new Date(),
        validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        qrCode: verifyUrl,
        pdfUrl: ''
      }
    });

    res.json(cert);
  } catch (error) {
    next(error);
  }
}

async function cancelCertificateForShop(req, res, next) {
  try {
    const latestCertificate = await prisma.certificate.findFirst({
      where: { shopId: req.params.shopId },
      orderBy: { issueDate: 'desc' }
    });

    if (!latestCertificate) {
      return res.status(404).json({ message: 'No certificate found for this shop.' });
    }

    await prisma.certificate.delete({ where: { id: latestCertificate.id } });

    return res.json({
      message: 'Certificate canceled successfully.',
      deletedCertificateCode: latestCertificate.certificateCode
    });
  } catch (error) {
    next(error);
  }
}

async function verifyCertificate(req, res, next) {
  try {
    const cert = await prisma.certificate.findUnique({
      where: { certificateCode: req.params.code },
      include: { shop: { include: { owner: true } } }
    });
    if (!cert) return res.status(404).json({ valid: false });
    return res.json({
      valid: true,
      cert,
      shop: {
        shopName: cert.shop.shopName,
        ownerName: cert.shop.owner?.name,
        mobile: cert.shop.owner?.mobile,
        address: cert.shop.address,
        location: {
          latitude: cert.shop.latitude,
          longitude: cert.shop.longitude,
          mapUrl: `https://maps.google.com/?q=${cert.shop.latitude},${cert.shop.longitude}`
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getMyLatestCertificate(req, res, next) {
  try {
    const shop = await prisma.barberShop.findUnique({ where: { ownerId: req.user.sub } });
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found for barber.' });
    }

    const latestCertificate = await prisma.certificate.findFirst({
      where: { shopId: shop.id },
      orderBy: { issueDate: 'desc' }
    });

    if (!latestCertificate) {
      return res.status(404).json({
        message: 'No certificate has been issued for your shop yet.'
      });
    }

    return res.json(latestCertificate);
  } catch (error) {
    next(error);
  }
}

async function downloadMyLatestCertificate(req, res, next) {
  let tempPath;
  try {
    const shop = await prisma.barberShop.findUnique({
      where: { ownerId: req.user.sub },
      include: { owner: true }
    });

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found for barber.' });
    }

    const latestCertificate = await prisma.certificate.findFirst({
      where: { shopId: shop.id },
      orderBy: { issueDate: 'desc' }
    });

    if (!latestCertificate) {
      return res.status(404).json({ message: 'No certificate has been issued for your shop yet.' });
    }

    tempPath = await generateCertificatePdf({
      shopRegNo: shop.shopRegistrationNumber,
      shopName: shop.shopName,
      ownerName: shop.owner?.name || shop.ownerName,
      ownerMobile: shop.owner?.mobile,
      category: shop.category,
      roomNo: shop.roomNumber,
      buildingNo: shop.buildingNumber,
      wardNo: shop.wardNumber,
      localBody: shop.localBody,
      address: shop.address,
      district: shop.district,
      state: shop.state,
      latitude: shop.latitude,
      longitude: shop.longitude,
      certificateCode: latestCertificate.certificateCode,
      issueDate: latestCertificate.issueDate,
      verifyUrl: latestCertificate.qrCode,
      persist: false
    });

    return res.download(tempPath, `mycrowb-certificate-${latestCertificate.certificateCode}.pdf`, async () => {
      await fs.unlink(tempPath).catch(() => undefined);
    });
  } catch (error) {
    if (tempPath) await fs.unlink(tempPath).catch(() => undefined);
    next(error);
  }
}

module.exports = {
  issueCertificate,
  cancelCertificateForShop,
  verifyCertificate,
  getMyLatestCertificate,
  downloadMyLatestCertificate
};
