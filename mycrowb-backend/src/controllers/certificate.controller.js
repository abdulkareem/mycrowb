const prisma = require('../config/prisma');
const { appBaseUrl } = require('../config/env');
const { generateCertificatePdf } = require('../services/pdf.service');

async function issueCertificate(req, res, next) {
  try {
    const code = `MC-${Date.now()}`;
    const verifyUrl = `${appBaseUrl}/api/v1/certificates/verify/${code}`;

    const shop = await prisma.barberShop.findUniqueOrThrow({ where: { id: req.body.shopId }, include: { owner: true } });
    const pdfUrl = await generateCertificatePdf({
      shopName: shop.shopName,
      ownerName: shop.owner?.name,
      ownerMobile: shop.owner?.mobile,
      address: shop.address,
      city: shop.city,
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
    if (!shop) return res.status(404).json({ message: 'Shop not found for barber' });

    const cert = await prisma.certificate.findFirst({
      where: { shopId: shop.id },
      orderBy: { issueDate: 'desc' }
    });

    if (!cert) return res.status(404).json({ message: 'No certificates found' });
    return res.json(cert);
  } catch (error) {
    next(error);
  }
}

module.exports = { issueCertificate, verifyCertificate, getMyLatestCertificate };
