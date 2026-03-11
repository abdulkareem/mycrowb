const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { appBaseUrl } = require('../config/env');
const { createPdf } = require('../utils/pdf');

const COMPANY_GREEN = '#2E7D32';
const DARK_TEXT = '#1A1A1A';
const LIGHT_LINE = '#A5D6A7';
const RECEIPT_MARGIN = 34;
const CERTIFICATE_MARGIN = 38;
const EMBLEM_IMAGE = path.join(__dirname, '..', 'assets', 'mycrowbemblem.png');

function valueOrFallback(value, fallback = '-') {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized.length ? normalized : fallback;
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `₹ ${amount.toFixed(2)}`;
}

function formatDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-IN');
}

function drawEmblem(doc, x, y, size = 72, opacity = 1) {
  if (fs.existsSync(EMBLEM_IMAGE)) {
    doc.save();
    doc.opacity(opacity);
    doc.image(EMBLEM_IMAGE, x, y, { fit: [size, size], align: 'center', valign: 'center' });
    doc.restore();
    return;
  }

  doc.save();
  doc.opacity(opacity);
  doc.circle(x + (size / 2), y + (size / 2), size / 2.2).lineWidth(1).stroke(COMPANY_GREEN);
  doc.fontSize(Math.max(8, size / 7)).fillColor(COMPANY_GREEN).text('MYCROWB', x, y + (size / 2) - 6, {
    width: size,
    align: 'center'
  });
  doc.restore();
}

function drawSectionTitle(doc, title, x, y, width) {
  doc.roundedRect(x, y, width, 18, 4).fillAndStroke('#EDF7EE', LIGHT_LINE);
  doc.fillColor(COMPANY_GREEN).font('Helvetica-Bold').fontSize(10).text(title, x + 8, y + 5);
}

function drawSingleLineText(doc, text, x, y, width, align = 'left') {
  doc.text(valueOrFallback(text), x, y, {
    width,
    align,
    lineBreak: false,
    ellipsis: true
  });
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

  await createPdf(filepath, (doc) => {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - (RECEIPT_MARGIN * 2);

    doc.roundedRect(RECEIPT_MARGIN - 8, RECEIPT_MARGIN - 10, contentWidth + 16, pageHeight - (RECEIPT_MARGIN * 2) + 18, 10)
      .lineWidth(1.2)
      .strokeColor(COMPANY_GREEN)
      .stroke();

    drawEmblem(doc, (pageWidth / 2) - 38, RECEIPT_MARGIN - 2, 76);

    doc.y = RECEIPT_MARGIN + 78;
    doc.fillColor(DARK_TEXT).font('Helvetica-Bold').fontSize(15).text('MYCROWB YOUR ECO FRIEND LLP', RECEIPT_MARGIN, doc.y, {
      width: contentWidth,
      align: 'center'
    });
    doc.font('Helvetica').fontSize(9.4)
      .text('LLPIN: AAQ-4431 | GST: 32ABMFM3589M1ZM', { align: 'center' })
      .text('Katty Tower, Tirurangadi, Kerala - 676306', { align: 'center' })
      .text('DPIIT: DIPP46156 | KSUM: KSUM641 | MSME: UDYAM-KL-09-0017853', { align: 'center' });

    doc.moveDown(0.6);
    doc.fillColor(COMPANY_GREEN).font('Times-Bold').fontSize(19).text('OFFICIAL PAYMENT RECEIPT', { align: 'center' });

    const headerY = doc.y + 8;
    const halfWidth = (contentWidth - 14) / 2;
    doc.roundedRect(RECEIPT_MARGIN, headerY, halfWidth, 46, 6).fillAndStroke('#F4FAF4', LIGHT_LINE);
    doc.roundedRect(RECEIPT_MARGIN + halfWidth + 14, headerY, halfWidth, 46, 6).fillAndStroke('#F4FAF4', LIGHT_LINE);

    doc.fillColor(DARK_TEXT).font('Helvetica-Bold').fontSize(10.2)
      .text(`Receipt No: ${valueOrFallback(receiptNumber)}`, RECEIPT_MARGIN + 10, headerY + 9)
      .font('Helvetica').fontSize(9.5)
      .text(`Receipt Date: ${formatDate(paymentDate)}`, RECEIPT_MARGIN + 10, headerY + 24)
      .text(`Payment Month: ${valueOrFallback(paymentMonth)}`, RECEIPT_MARGIN + halfWidth + 24, headerY + 9)
      .text(`Collection Year: ${valueOrFallback(collectionYear)}`, RECEIPT_MARGIN + halfWidth + 24, headerY + 24);

    let y = headerY + 62;
    drawSectionTitle(doc, 'Shop Information', RECEIPT_MARGIN, y, contentWidth);
    y += 24;

    const addressLine = [roomNumber, buildingNumber, wardNumber, localBody, district, state]
      .filter(Boolean)
      .join(', ');

    const shopRows = [
      ['Shop Reg.No.', valueOrFallback(shopRegNo)],
      ['Shop Name', valueOrFallback(shopName)],
      ['Owner Name', valueOrFallback(ownerName)],
      ['Mobile Number', valueOrFallback(mobileNumber)],
      ['Address', valueOrFallback(addressLine)]
    ];

    shopRows.forEach(([label, value], index) => {
      if (index % 2 === 0) {
        doc.rect(RECEIPT_MARGIN + 1, y - 2, contentWidth - 2, 16).fill('#FBFDFB');
      }
      doc.fillColor(DARK_TEXT).font('Helvetica-Bold').fontSize(9.4).text(`${label}:`, RECEIPT_MARGIN + 8, y, { width: 115 });
      drawSingleLineText(doc.font('Helvetica'), value, RECEIPT_MARGIN + 124, y, contentWidth - 132);
      y += 16;
    });

    y += 6;
    drawSectionTitle(doc, 'Payment Details', RECEIPT_MARGIN, y, contentWidth);
    y += 25;

    const descColW = contentWidth - 140;
    doc.rect(RECEIPT_MARGIN, y, contentWidth, 22).stroke('#9DBF9F');
    doc.moveTo(RECEIPT_MARGIN + descColW, y).lineTo(RECEIPT_MARGIN + descColW, y + 22).stroke('#9DBF9F');
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(DARK_TEXT)
      .text('Description', RECEIPT_MARGIN + 8, y + 7)
      .text('Amount', RECEIPT_MARGIN + descColW + 8, y + 7);

    y += 22;
    doc.rect(RECEIPT_MARGIN, y, contentWidth, 20).stroke('#9DBF9F');
    doc.moveTo(RECEIPT_MARGIN + descColW, y).lineTo(RECEIPT_MARGIN + descColW, y + 20).stroke('#9DBF9F');
    doc.font('Helvetica').fontSize(9.2)
      .text('Monthly Hair Waste Collection Fee', RECEIPT_MARGIN + 8, y + 6)
      .text(formatCurrency(amount), RECEIPT_MARGIN + descColW + 8, y + 6);

    y += 26;
    doc.font('Helvetica').fontSize(9.4).fillColor(DARK_TEXT)
      .text(`Subtotal: ${formatCurrency(amount)}`, RECEIPT_MARGIN, y, { width: contentWidth, align: 'right' })
      .text(`GST: ${formatCurrency(gst)}`, RECEIPT_MARGIN, y + 14, { width: contentWidth, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COMPANY_GREEN)
      .text(`Total Amount Paid: ${formatCurrency(resolvedTotal)}`, RECEIPT_MARGIN, y + 30, { width: contentWidth, align: 'right' });

    y += 46;
    drawSectionTitle(doc, 'Verification & Collection Info', RECEIPT_MARGIN, y, contentWidth);
    y += 24;

    doc.fillColor(DARK_TEXT).font('Helvetica').fontSize(9.2)
      .text(`Payment Mode: ${valueOrFallback(paymentMode, 'Not specified')}`, RECEIPT_MARGIN + 8, y)
      .text(`Transaction ID: ${valueOrFallback(transactionId, 'Not available')}`, RECEIPT_MARGIN + 8, y + 14)
      .text(`Collected By: ${valueOrFallback(collectorName, 'Not assigned')}`, RECEIPT_MARGIN + 8, y + 26)
      .text(`Receipt Code: ${valueOrFallback(receiptCode || receiptNumber)}`, RECEIPT_MARGIN + 8, y + 40);

    drawSingleLineText(
      doc.fontSize(8.7).fillColor('#3E3E3E'),
      `Verification Link: ${verifyUrl}`,
      RECEIPT_MARGIN + 8,
      y + 54,
      contentWidth - 110
    );

    const qrBuffer = Buffer.from(qrData.split(',')[1], 'base64');
    doc.image(qrBuffer, pageWidth - RECEIPT_MARGIN - 90, y + 24, { fit: [82, 82] });

    drawSingleLineText(
      doc.font('Helvetica').fontSize(8.3).fillColor('#5C5C5C'),
      'This is a computer-generated receipt and does not require handwritten signature or seal.',
      RECEIPT_MARGIN,
      pageHeight - RECEIPT_MARGIN - 38,
      contentWidth,
      'center'
    );
  }, {
    size: 'A4',
    layout: 'portrait',
    margins: {
      top: RECEIPT_MARGIN,
      bottom: RECEIPT_MARGIN,
      left: RECEIPT_MARGIN,
      right: RECEIPT_MARGIN
    }
  });

  return filepath;
}

function drawCertificateBorder(doc) {
  const { width, height } = doc.page;
  doc.roundedRect(CERTIFICATE_MARGIN - 12, CERTIFICATE_MARGIN - 12, width - ((CERTIFICATE_MARGIN - 12) * 2), height - ((CERTIFICATE_MARGIN - 12) * 2), 14)
    .lineWidth(1.4)
    .strokeColor(COMPANY_GREEN)
    .stroke();

  doc.roundedRect(CERTIFICATE_MARGIN - 4, CERTIFICATE_MARGIN - 4, width - ((CERTIFICATE_MARGIN - 4) * 2), height - ((CERTIFICATE_MARGIN - 4) * 2), 10)
    .lineWidth(0.7)
    .strokeColor('#B7D8B8')
    .stroke();
}

async function generateCertificatePdf({
  shopRegNo,
  shopName,
  ownerName,
  ownerMobile,
  category,
  roomNo,
  buildingNo,
  wardNo,
  localBody,
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
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - (CERTIFICATE_MARGIN * 2);
    const leftX = CERTIFICATE_MARGIN;
    const locationCoordinates = latitude != null && longitude != null ? `${latitude}, ${longitude}` : 'Not available';

    drawCertificateBorder(doc);
    drawEmblem(doc, (pageWidth - 230) / 2, (pageHeight - 230) / 2, 230, 0.06);
    drawEmblem(doc, (pageWidth / 2) - 48, CERTIFICATE_MARGIN - 8, 96);

    doc.y = CERTIFICATE_MARGIN + 92;
    doc.fillColor(DARK_TEXT).font('Helvetica-Bold').fontSize(15).text('MYCROWB YOUR ECO FRIEND LLP', leftX, doc.y, {
      width: contentWidth,
      align: 'center'
    });
    doc.font('Helvetica').fontSize(10)
      .text('LLPIN: AAQ-4431 | GST: 32ABMFM3589M1ZM', { align: 'center' })
      .text('Katty Tower, Tirurangadi, Kerala - 676306', { align: 'center' })
      .text('DPIIT Reg. ID: DIPP46156 | KSUM Reg. ID: KSUM641 | MSME: UDYAM-KL-09-0017853', { align: 'center' });

    doc.moveDown(0.85);
    doc.font('Times-Bold').fontSize(23).fillColor(COMPANY_GREEN).text('Hair Waste Recycling Certificate', {
      align: 'center'
    });

    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(9.5).fillColor(DARK_TEXT).text(
      'This certificate confirms that the following establishment is an approved participant in the MYCROWB Hair Waste Recycling Network and is committed to responsible waste collection and eco-friendly disposal practices.',
      leftX + 8,
      doc.y,
      { width: contentWidth - 16, align: 'center' }
    );

    let y = doc.y + 10;
    const labelWidth = 150;
    const rowHeight = 12;
    const rows = [
      ['Shop Reg.No.', valueOrFallback(shopRegNo)],
      ['Shop Name', valueOrFallback(shopName, 'Community Barber Shop')],
      ['Owner Name', valueOrFallback(ownerName)],
      ['Mobile Number', valueOrFallback(ownerMobile)],
      ['Category', valueOrFallback(category)],
      ['Room No.', valueOrFallback(roomNo)],
      ['Building No.', valueOrFallback(buildingNo)],
      ['Ward No.', valueOrFallback(wardNo)],
      ['Local Body', valueOrFallback(localBody)],
      ['Address', valueOrFallback(address)],
      ['District / State', `${valueOrFallback(district)} / ${valueOrFallback(state)}`],
      ['Location Coordinates', valueOrFallback(locationCoordinates)]
    ];

    doc.roundedRect(leftX, y - 6, contentWidth, (rows.length * rowHeight) + 12, 8).lineWidth(0.8).strokeColor(LIGHT_LINE).stroke();

    rows.forEach(([label, value], index) => {
      const rowY = y + (index * rowHeight);
      if (index % 2 === 0) {
        doc.rect(leftX + 1, rowY - 1, contentWidth - 2, rowHeight).fill('#F8FCF8');
      }
      doc.fillColor(DARK_TEXT).font('Helvetica-Bold').fontSize(9.5).text(`${label}:`, leftX + 8, rowY, { width: labelWidth });
      drawSingleLineText(doc.font('Helvetica').fontSize(9.5), value, leftX + labelWidth + 8, rowY, contentWidth - labelWidth - 16);
    });

    y += (rows.length * rowHeight) + 8;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(DARK_TEXT)
      .text(`Certificate Code: ${valueOrFallback(certificateCode, 'Not issued')}`, leftX + 4, y)
      .text(`Issue Date: ${new Date(issueDate).toDateString()}`, leftX + 4, y + 12);

    drawSingleLineText(
      doc.font('Helvetica').fontSize(8.6).fillColor('#2D2D2D'),
      'This certificate remains valid for one year from the issue date and may be cancelled if participation in the Mycrowb program is discontinued for two consecutive months.',
      leftX + 4,
      y + 24,
      contentWidth - 120
    );

    drawSingleLineText(
      doc.font('Helvetica-Bold').fontSize(9.1).fillColor(COMPANY_GREEN),
      `Verification Link: ${valueOrFallback(verifyUrl, 'Not available')}`,
      leftX + 4,
      y + 36,
      contentWidth - 120
    );

    if (qrData) {
      doc.image(Buffer.from(qrData.split(',')[1], 'base64'), pageWidth - CERTIFICATE_MARGIN - 80, y + 10, { width: 72 });
    }

    drawSingleLineText(
      doc.font('Helvetica').fontSize(8.5).fillColor('#4E4E4E'),
      'This is a computer-generated certificate and does not require handwritten signature or seal.',
      leftX,
      pageHeight - CERTIFICATE_MARGIN - 42,
      contentWidth,
      'center'
    );

    drawSingleLineText(
      doc.font('Helvetica-Bold').fontSize(10.2).fillColor('#000'),
      'MYCROWB YOUR ECO FRIEND LLP',
      leftX,
      pageHeight - CERTIFICATE_MARGIN - 28,
      contentWidth,
      'center'
    );
  }, {
    size: 'A4',
    layout: 'portrait',
    margins: {
      top: CERTIFICATE_MARGIN,
      bottom: CERTIFICATE_MARGIN,
      left: CERTIFICATE_MARGIN,
      right: CERTIFICATE_MARGIN
    }
  });

  return filepath;
}

module.exports = { generateReceiptPdf, generateCertificatePdf };
