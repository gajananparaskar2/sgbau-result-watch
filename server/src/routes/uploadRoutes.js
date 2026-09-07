const express = require('express');
const multer = require('multer');
const fs = require('fs');
const env = require('../config/env');
const { requireAuth } = require('../middleware/auth');
const { uploadResult } = require('../controllers/uploadController');

if (!fs.existsSync(env.UPLOAD_DIR)) fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, env.UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-z0-9._-]/gi, '_')}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    cb(null, allowed.includes(file.mimetype));
  }
});

const router = express.Router();
router.use(requireAuth);

router.post('/', upload.single('file'), uploadResult);

module.exports = router;
