const prisma = require('../config/prisma');
const { appBaseUrl } = require('../config/env');
const { generateCertificatePdf } = require('../services/pdf.service');

async function issueCertificate(req, res, next) {
  try {
    const code = `MC-${Date.now()}`;
    const verifyUrl = `${appBaseUrl}/api/v1/certificates/verify/${code}`;

    const shop = await prisma.barberShop.findUniqueOrThrow({ where: { id: req.body.shopId } });
    const pdfUrl = await generateCertificatePdf({
      shopName: shop.shopName,
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
      include: { shop: true }
    });
    if (!cert) return res.status(404).json({ valid: false });
    return res.json({ valid: true, cert });
  } catch (error) {
    next(error);
  }
}

module.exports = { issueCertificate, verifyCertificate };
