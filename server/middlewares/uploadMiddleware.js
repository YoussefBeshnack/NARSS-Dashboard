const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_PATH || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File Filter Criteria
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx|csv|txt|zip/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeTypeMatches = allowedExtensions.test(ext.replace('.', ''));

  if (mimeTypeMatches) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file extension/format'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB default
  },
  fileFilter: fileFilter,
});

module.exports = upload;
