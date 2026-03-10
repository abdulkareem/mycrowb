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
  district,
  state,
  latitude,
  longitude,
  certificateCode,
  issueDate,
  verifyUrl
}) {
  const filepath = path.join('uploads', 'certificates', `${certificateCode}.pdf`);
  const qrData = verifyUrl ? await QRCode.toDataURL(verifyUrl) : null;

  await createPdf(filepath, (doc) => {
    doc.fontSize(22).fillColor('#2E7D32').text('MYCROWB YOUR ECO FRIEND LLP', { align: 'center' });
    doc.moveDown().fontSize(18).fillColor('#000').text('Hair Waste Recycling Certificate', { align: 'center' });
    doc.moveDown().fontSize(13).text('This certifies that the below profile is a registered user of MyCrowb.', { align: 'center' });
    doc.moveDown(2);
    const location = latitude != null && longitude != null ? `${latitude}, ${longitude}` : 'Not provided';
    const fullAddress = [address, district, state].filter(Boolean).join(', ') || 'Not provided';

    doc.fontSize(12)
      .text(`Shop Name: ${shopName || 'Community Barber Shop'}`)
      .text(`Owner Name: ${ownerName || 'Not available'}`)
      .text(`Mobile Number: ${ownerMobile || 'Not available'}`)
      .text(`Address: ${fullAddress}`)
      .text(`Location: ${location}`)
      .text(`Certificate Code: ${certificateCode}`)
      .text(`Issue Date: ${new Date(issueDate).toDateString()}`)
      .text(`Verify: ${verifyUrl || 'Verification unavailable for blank certificate'}`);
    doc.moveDown();
    if (qrData) {
      doc.image(Buffer.from(qrData.split(',')[1], 'base64'), { fit: [120, 120], align: 'left' });
    } else {
      doc.fontSize(11).fillColor('#666').text('Placeholder certificate generated because complete profile data was unavailable.');
    }
  });

  return `/${filepath}`;
}

module.exports = { generateReceiptPdf, generateCertificatePdf };
