const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadDir } = require('../config/env');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

module.exports = {
  upload: multer({ storage })
};
