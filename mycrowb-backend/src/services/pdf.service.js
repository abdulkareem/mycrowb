const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { appBaseUrl } = require('../config/env');
const { createPdf } = require('../utils/pdf');

const COMPANY_GREEN = '#2E7D32';
const RECEIPT_MARGIN = 42.5; // 1.5 cm in points

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `₹ ${amount.toFixed(2)}`;
}

function formatDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-IN');
}

function drawEmblem(doc, centerX, topY) {
  const emblemPath = path.join(__dirname, '..', 'assets', 'mycrowb-emblem.png');
  if (fs.existsSync(emblemPath)) {
    doc.image(emblemPath, centerX - 42, topY, { fit: [84, 84], align: 'center' });
    return topY + 90;
  }

  doc.save();
  doc.circle(centerX, topY + 40, 38).lineWidth(1).stroke(COMPANY_GREEN);
  doc.fontSize(11).fillColor(COMPANY_GREEN).text('MYCROWB', centerX - 32, topY + 35, { width: 64, align: 'center' });
  doc.restore();
  return topY + 90;
}

async function generateReceiptPdf({
  receiptNumber,
  amount,
  gst = 0,
  totalAmount,
  paymentDate,
  paymentMonth,
  collectionYear,
  paymentMode,
  transactionId,
  shopRegNo,
  shopName,
  ownerName,
  mobileNumber,
  roomNumber,
  buildingNumber,
  wardNumber,
  localBody,
  district,
  state,
  collectorName,
  receiptCode,
  verificationUrl,
  persist = true
}) {
  const folder = persist ? path.join('uploads', 'receipts') : path.join('uploads', 'tmp');
  const filename = persist ? `${receiptNumber}.pdf` : `${receiptNumber}-${Date.now()}.pdf`;
  const filepath = path.join(folder, filename);

  const resolvedTotal = Number(totalAmount || (Number(amount || 0) + Number(gst || 0)));
  const verifyUrl = verificationUrl || `${appBaseUrl}/verify/receipt/${encodeURIComponent(receiptCode || receiptNumber)}`;
  const qrData = await QRCode.toDataURL(verifyUrl);

  await createPdf(
    filepath,
    (doc) => {
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      doc.rect(RECEIPT_MARGIN - 10, RECEIPT_MARGIN - 10, pageWidth - (RECEIPT_MARGIN - 10) * 2, pageHeight - (RECEIPT_MARGIN - 10) * 2)
        .lineWidth(1)
        .stroke(COMPANY_GREEN);

      let cursorY = drawEmblem(doc, pageWidth / 2, RECEIPT_MARGIN - 8);

      doc.fontSize(15).fillColor('#000').text('MYCROWB YOUR ECO FRIEND LLP', RECEIPT_MARGIN, cursorY, { align: 'center' });
      doc.fontSize(9)
        .text('LLPIN: AAQ-4431', { align: 'center' })
        .text('Katty Tower, Tirurangadi, Kerala – 676306', { align: 'center' })
        .text('GST: 32ABMFM3589M1ZM', { align: 'center' })
        .moveDown(0.2)
        .text('DPIIT Startup Reg ID: DIPP46156', { align: 'center' })
        .text('Kerala Startup Mission Reg ID: KSUM641', { align: 'center' })
        .text('MSME Registration: UDYAM-KL-09-0017853', { align: 'center' });

      doc.moveDown(0.8);
      doc.fontSize(16).fillColor(COMPANY_GREEN).text('Hair Waste Collection Payment Receipt', { align: 'center' });
      doc.moveDown(0.5);

      const leftX = RECEIPT_MARGIN;
      const rightX = pageWidth / 2 + 10;
      let rowY = doc.y;

      doc.fontSize(10).fillColor('#111')
        .text(`Receipt No: ${receiptNumber || '-'}`, leftX, rowY)
        .text(`Receipt Date: ${formatDate(paymentDate)}`, rightX, rowY)
        .text(`Payment Month: ${paymentMonth || '-'}`, leftX, doc.y + 3)
        .text(`Collection Year: ${collectionYear || '-'}`, rightX, doc.y);

      doc.moveDown(0.6);
      doc.fontSize(11).fillColor(COMPANY_GREEN).text('Shop Information');
      doc.moveDown(0.2);

      const info = [
        ['Shop Reg.No', shopRegNo],
        ['Shop Name', shopName],
        ['Owner Name', ownerName],
        ['Mobile Number', mobileNumber],
        ['Room No.', roomNumber],
        ['Building No.', buildingNumber],
        ['Ward No.', wardNumber],
        ['Local Body', localBody],
        ['District', district],
        ['State', state]
      ];

      info.forEach(([label, value]) => {
        doc.fontSize(9.5).fillColor('#111').text(`${label}: ${value || '-'}`);
      });

      doc.moveDown(0.6);
      doc.fontSize(11).fillColor(COMPANY_GREEN).text('Payment Details');
      doc.moveDown(0.2);

      const tableX = RECEIPT_MARGIN;
      const tableW = pageWidth - RECEIPT_MARGIN * 2;
      const rowH = 22;
      const amountColX = tableX + tableW - 130;
      let tableY = doc.y;

      doc.rect(tableX, tableY, tableW, rowH).stroke('#999');
      doc.moveTo(amountColX, tableY).lineTo(amountColX, tableY + rowH).stroke('#999');
      doc.fontSize(10).fillColor('#000').text('Description', tableX + 6, tableY + 7);
      doc.text('Amount', amountColX + 6, tableY + 7);

      tableY += rowH;
      doc.rect(tableX, tableY, tableW, rowH).stroke('#999');
      doc.moveTo(amountColX, tableY).lineTo(amountColX, tableY + rowH).stroke('#999');
      doc.fontSize(9.5).text('Monthly Hair Waste Collection Fee', tableX + 6, tableY + 7);
      doc.text(formatCurrency(amount), amountColX + 6, tableY + 7);

      doc.y = tableY + rowH + 8;
      doc.fontSize(9.5)
        .text(`Subtotal: ${formatCurrency(amount)}`, { align: 'right' })
        .text(`GST: ${formatCurrency(gst)}`, { align: 'right' })
        .fillColor(COMPANY_GREEN)
        .fontSize(10.5)
        .text(`Total Amount Paid: ${formatCurrency(resolvedTotal)}`, { align: 'right' });

      doc.moveDown(0.5).fillColor(COMPANY_GREEN).fontSize(11).text('Payment Information');
      doc.moveDown(0.2).fillColor('#111').fontSize(9.5)
        .text(`Payment Mode: ${paymentMode || 'Not specified'}`)
        .text(`Transaction ID: ${transactionId || 'Not available'}`)
        .text(`Collected By: ${collectorName || 'Not assigned'}`);

      doc.moveDown(0.5).fillColor(COMPANY_GREEN).fontSize(11).text('Verification');
      doc.moveDown(0.2).fillColor('#111').fontSize(9.5)
        .text(`Receipt Code: ${receiptCode || receiptNumber || '-'}`)
        .text(`Verification Link: ${verifyUrl}`);

      const qrBuffer = Buffer.from(qrData.split(',')[1], 'base64');
      doc.image(qrBuffer, pageWidth - RECEIPT_MARGIN - 90, doc.y - 8, { fit: [80, 80] });

      doc.fontSize(8.5)
        .fillColor('#555')
        .text(
          'This is a computer generated receipt issued by MYCROWB YOUR ECO FRIEND LLP and does not require handwritten signature or seal.',
          RECEIPT_MARGIN,
          pageHeight - RECEIPT_MARGIN - 20,
          { align: 'center' }
        );
    },
    {
      size: 'A5',
      margins: {
        top: RECEIPT_MARGIN,
        bottom: RECEIPT_MARGIN,
        left: RECEIPT_MARGIN,
        right: RECEIPT_MARGIN
      }
    }
  );

  return filepath;
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
  verifyUrl,
  persist = true
}) {
  const folder = persist ? path.join('uploads', 'certificates') : path.join('uploads', 'tmp');
  const filename = persist ? `${certificateCode}.pdf` : `${certificateCode}-${Date.now()}.pdf`;
  const filepath = path.join(folder, filename);
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

  return filepath;
}

module.exports = { generateReceiptPdf, generateCertificatePdf };
