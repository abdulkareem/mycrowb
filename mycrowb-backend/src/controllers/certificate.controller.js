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

  // Extremely unlikely collision, but we still ensure uniqueness.
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

    const pdfUrl = await generateCertificatePdf({
      shopName: shop.shopName,
      ownerName: shop.owner?.name,
      ownerMobile: shop.owner?.mobile,
      address: shop.address,
      district: shop.district,
      state: shop.state,
      latitude: shop.latitude,
      longitude: shop.longitude,
      certificateCode: code,
      issueDate: new Date(),
      verifyUrl
    });

    const cert = await prisma.certificate.create({
      data: {
        shopId: req.body.shopId,
        certificateCode: code,
        certificateType: req.body.certificateType || 'MONTHLY',
        issueDate: new Date(),
        validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        qrCode: verifyUrl,
        pdfUrl
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
    const shop = await prisma.barberShop.findUnique({
      where: { ownerId: req.user.sub },
      include: { owner: true }
    });

    if (!shop) {
      const code = await createUniqueCertificateCode('PLACEHOLDER');
      const issueDate = new Date();
      const pdfUrl = await generateCertificatePdf({
        shopName: 'MyCrowb Registered Barber',
        ownerName: 'Name not available',
        ownerMobile: 'Not available',
        address: 'Address not available',
        district: null,
        state: null,
        latitude: null,
        longitude: null,
        certificateCode: code,
        issueDate,
        verifyUrl: null
      });

      return res.json({
        certificateCode: code,
        issueDate,
        pdfUrl,
        isPlaceholder: true,
        message: 'Blank certificate generated due to unavailable barber profile data.'
      });
    }

    const latestCertificate = await prisma.certificate.findFirst({
      where: { shopId: shop.id },
      orderBy: { issueDate: 'desc' }
    });

    if (latestCertificate) {
      return res.json(latestCertificate);
    }

    return res.status(404).json({
      message: 'No certificate has been issued for your shop yet.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { issueCertificate, cancelCertificateForShop, verifyCertificate, getMyLatestCertificate };
