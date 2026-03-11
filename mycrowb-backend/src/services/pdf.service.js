const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { createPdf } = require('../utils/pdf');

const EMBLEM_BASE64_PATH = path.join(__dirname, '..', 'assets', 'mycrowb-emblem.base64');
const EMBLEM_IMAGE = Buffer.from(fs.readFileSync(EMBLEM_BASE64_PATH, 'utf8').trim(), 'base64');
const ECO_GREEN = '#2E7D32';
const PAGE_MARGIN = 42.52;

function valueOrFallback(value, fallback = 'Not available') {
  return value == null || value === '' ? fallback : String(value);
}

function drawCertificateBorder(doc) {
  const borderInset = 8;
  doc.save();
  doc.lineWidth(1)
    .strokeColor(ECO_GREEN)
    .rect(borderInset, borderInset, doc.page.width - (borderInset * 2), doc.page.height - (borderInset * 2))
    .stroke();
  doc.restore();
}

async function generateReceiptPdf({
  receiptNumber,
  amount,
  paymentDate,
  shopName,
  collectorName,
  collectorMobile,
  persist = true
}) {
  const folder = persist ? path.join('uploads', 'receipts') : path.join('uploads', 'tmp');
  const filename = persist ? `${receiptNumber}.pdf` : `${receiptNumber}-${Date.now()}.pdf`;
  const filepath = path.join(folder, filename);

  await createPdf(filepath, (doc) => {
    doc.fontSize(20).text('MYCROWB YOUR ECO FRIEND LLP', { align: 'center' });
    doc.moveDown().fontSize(16).text('Collection Payment Receipt', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12)
      .text(`Receipt Number: ${receiptNumber}`)
      .text(`Shop Name: ${shopName}`)
      .text(`Amount: ₹${amount.toFixed(2)}`)
      .text(`Payment Date: ${new Date(paymentDate).toDateString()}`)
      .text(`Collection Staff: ${collectorName || 'Not assigned'}`)
      .text(`Staff Mobile: ${collectorMobile || 'Not available'}`);
  });
  return filepath;
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
    drawCertificateBorder(doc);

    const usableWidth = doc.page.width - (PAGE_MARGIN * 2);
    const centerX = doc.page.width / 2;
    const locationCoordinates = latitude != null && longitude != null ? `${latitude}, ${longitude}` : 'Not available';

    doc.save();
    doc.opacity(0.05);
    doc.image(EMBLEM_IMAGE, (doc.page.width - 220) / 2, (doc.page.height - 220) / 2, { width: 220 });
    doc.restore();

    doc.image(EMBLEM_IMAGE, centerX - 52, 38, { width: 104 });

    doc.y = 152;
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(15).text('MYCROWB YOUR ECO FRIEND LLP', PAGE_MARGIN, doc.y, {
      width: usableWidth,
      align: 'center'
    });
    doc.moveDown(0.35);
    doc.font('Helvetica').fontSize(10.5).text('LLPIN: AAQ-4431', { align: 'center' });
    doc.moveDown(0.15);
    doc.text('Katty Tower, Tirurangadi, Kerala – 676306', { align: 'center' });
    doc.moveDown(0.15);
    doc.text('GST: 32ABMFM3589M1ZM', { align: 'center' });
    doc.moveDown(0.55);
    doc.fontSize(9.3)
      .text('Department for Promotion of Industry and Internal Trade (DPIIT), Government of India – Reg. ID: DIPP46156', {
        align: 'center'
      })
      .text('Kerala Startup Mission – Reg. ID: KSUM641', { align: 'center' })
      .text('MSME Registration – UDYAM-KL-09-0017853', { align: 'center' })
      .text('Kerala Startup Mission Climathon Award Winner', { align: 'center' });

    doc.moveDown(1);
    doc.font('Times-Bold').fontSize(26).fillColor(ECO_GREEN).text('Hair Waste Recycling Certificate', {
      align: 'center'
    });

    doc.moveDown(0.8);
    doc.font('Helvetica').fontSize(10.8).fillColor('#111').text(
      'This is to certify that the following establishment is a registered participant in the Hair Waste Recycling Network of MYCROWB YOUR ECO FRIEND LLP, contributing to the responsible collection and recycling of salon/beauty parlour hair waste for eco-friendly applications.',
      PAGE_MARGIN + 8,
      doc.y,
      { width: usableWidth - 16, align: 'center' }
    );

    const tableStartY = doc.y + 16;
    const leftX = PAGE_MARGIN + 16;
    const labelWidth = 170;
    const valueWidth = usableWidth - 32 - labelWidth;
    const rowHeight = 18;

    const rows = [
      ['Shop Reg.No.', valueOrFallback(shopRegNo)],
      ['Shop Name', valueOrFallback(shopName, 'Community Barber Shop')],
      ['Owner Name', valueOrFallback(ownerName)],
      ['Mobile Number', valueOrFallback(ownerMobile)],
      ['Beauty Parlour Category', valueOrFallback(category)],
      ['Room No.', valueOrFallback(roomNo)],
      ['Building No.', valueOrFallback(buildingNo)],
      ['Ward No.', valueOrFallback(wardNo)],
      ['Local Body Name', valueOrFallback(localBody)],
      ['Address', valueOrFallback(address)],
      ['District', valueOrFallback(district)],
      ['State', valueOrFallback(state)],
      ['Location Coordinates', valueOrFallback(locationCoordinates)]
    ];

    const tableHeight = rowHeight * rows.length;
    doc.save();
    doc.roundedRect(leftX - 8, tableStartY - 6, usableWidth - 16, tableHeight + 12, 6).lineWidth(0.8).strokeColor('#9CCC9C').stroke();
    doc.restore();

    rows.forEach(([label, value], index) => {
      const y = tableStartY + (index * rowHeight);
      if (index % 2 === 0) {
        doc.save();
        doc.rect(leftX - 7, y - 2, usableWidth - 18, rowHeight).fillOpacity(0.05).fill('#2E7D32');
        doc.restore();
      }

      doc.font('Helvetica-Bold').fontSize(10.1).fillColor('#1a1a1a').text(`${label}:`, leftX, y, {
        width: labelWidth,
        align: 'left'
      });
      doc.font('Helvetica').fontSize(10.1).text(value, leftX + labelWidth, y, {
        width: valueWidth,
        align: 'left'
      });
    });

    const detailsY = tableStartY + tableHeight + 14;
    doc.font('Helvetica-Bold').fontSize(10.6).fillColor('#000')
      .text(`Certificate Code: ${valueOrFallback(certificateCode, 'Not issued')}`, leftX, detailsY)
      .text(`Issue Date: ${new Date(issueDate).toDateString()}`, leftX, doc.y + 2);

    doc.moveDown(0.45);
    doc.font('Helvetica').fontSize(9.7).fillColor('#222').text(
      'This certificate is valid for one year and may be cancelled if the shop discontinues participation in the Mycrowb hair waste recycling program for two months.',
      leftX,
      doc.y,
      { width: usableWidth - 16 }
    );

    doc.moveDown(0.55);
    doc.font('Helvetica-Bold').fontSize(10.2).text(`Verification Link: ${valueOrFallback(verifyUrl, 'Not available')}`, leftX, doc.y, {
      width: usableWidth - 160
    });

    if (qrData) {
      doc.image(Buffer.from(qrData.split(',')[1], 'base64'), doc.page.width - PAGE_MARGIN - 104, doc.y - 8, {
        width: 90
      });
    }

    const footerY = doc.page.height - 68;
    doc.font('Helvetica').fontSize(8.8).fillColor('#4a4a4a')
      .text('This is a computer generated certificate and does not require handwritten signature or seal.', PAGE_MARGIN, footerY, {
        width: usableWidth,
        align: 'center'
      })
      .text('The certificate can be verified online using the certificate code or QR code.', {
        width: usableWidth,
        align: 'center'
      });

    doc.font('Helvetica-Bold').fontSize(10.4).fillColor('#000').text('MYCROWB YOUR ECO FRIEND LLP', PAGE_MARGIN, doc.page.height - 26, {
      width: usableWidth,
      align: 'center'
    });
  }, {
    size: 'A4',
    layout: 'portrait',
    margins: {
      top: PAGE_MARGIN,
      bottom: PAGE_MARGIN,
      left: PAGE_MARGIN,
      right: PAGE_MARGIN
    }
  });

  return filepath;
}

module.exports = { generateReceiptPdf, generateCertificatePdf };
