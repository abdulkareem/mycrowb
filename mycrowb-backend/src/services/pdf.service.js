const path = require('path');
const QRCode = require('qrcode');
const { createPdf } = require('../utils/pdf');

async function generateReceiptPdf({ receiptNumber, amount, paymentDate, shopName }) {
  const filepath = path.join('uploads', 'receipts', `${receiptNumber}.pdf`);
  await createPdf(filepath, (doc) => {
    doc.fontSize(20).text('MYCROWB YOUR ECO FRIEND LLP', { align: 'center' });
    doc.moveDown().fontSize(16).text('Collection Payment Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12)
      .text(`Receipt Number: ${receiptNumber}`)
      .text(`Shop Name: ${shopName}`)
      .text(`Amount: ₹${amount.toFixed(2)}`)
      .text(`Payment Date: ${new Date(paymentDate).toDateString()}`);
  });
  return `/${filepath}`;
}

async function generateCertificatePdf({
  shopName,
  ownerName,
  ownerMobile,
  address,
  city,
  state,
  latitude,
  longitude,
  certificateCode,
  issueDate,
  verifyUrl
}) {
  const filepath = path.join('uploads', 'certificates', `${certificateCode}.pdf`);
  const qrData = await QRCode.toDataURL(verifyUrl);

  await createPdf(filepath, (doc) => {
    doc.fontSize(22).fillColor('#2E7D32').text('MYCROWB YOUR ECO FRIEND LLP', { align: 'center' });
    doc.moveDown().fontSize(18).fillColor('#000').text('Hair Waste Recycling Certificate', { align: 'center' });
    doc.moveDown().fontSize(13).text('This certifies that the below profile is a registered user of MyCrowb.', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(12)
      .text(`Shop Name: ${shopName}`)
      .text(`Owner Name: ${ownerName || 'N/A'}`)
      .text(`Mobile Number: ${ownerMobile || 'N/A'}`)
      .text(`Address: ${address || ''}, ${city || ''}, ${state || ''}`)
      .text(`Location: ${latitude}, ${longitude}`)
      .text(`Certificate Code: ${certificateCode}`)
      .text(`Issue Date: ${new Date(issueDate).toDateString()}`)
      .text(`Verify: ${verifyUrl}`);
    doc.moveDown();
    doc.image(Buffer.from(qrData.split(',')[1], 'base64'), { fit: [120, 120], align: 'left' });
  });

  return `/${filepath}`;
}

module.exports = { generateReceiptPdf, generateCertificatePdf };
