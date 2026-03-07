const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function createPdf(filename, builder) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filename);
  doc.pipe(stream);
  builder(doc);
  doc.end();
  return new Promise((resolve) => {
    stream.on('finish', () => resolve(filename));
  });
}

module.exports = { createPdf };
