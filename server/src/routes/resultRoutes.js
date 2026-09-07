const express = require('express');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const {
  listResults,
  getResult,
  downloadPdf,
  checkInstant,
  downloadPdfByFilename,
  deleteResult,
  deleteResultsBatch
} = require('../controllers/resultController');

const router = express.Router();

// Instant result check (works for guests and logged-in users)
router.post('/check-instant', optionalAuth, checkInstant);
router.get('/download-pdf-file/:filename', downloadPdfByFilename);

// Authenticated user results
router.get('/', requireAuth, listResults);
router.post('/batch-delete', requireAuth, deleteResultsBatch);
router.get('/:id', requireAuth, getResult);
router.delete('/:id', requireAuth, deleteResult);
router.get('/:id/pdf', requireAuth, downloadPdf);

module.exports = router;
