const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png/;
  const allowedVideoTypes = /mp4|mov/;
  const allowedAudioTypes = /mp3|wav/;
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedImageTypes.test(ext) || allowedVideoTypes.test(ext) || allowedAudioTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only images, videos, and audio files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 20971520 // 20MB default
  },
  fileFilter: fileFilter
});

module.exports = upload;