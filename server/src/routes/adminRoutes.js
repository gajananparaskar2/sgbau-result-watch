const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { dashboard, logs, getSettings, updateSetting, retryProfile } = require('../controllers/adminController');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/dashboard', dashboard);
router.get('/logs', logs);
router.get('/settings', getSettings);
router.put('/settings', updateSetting);
router.post('/profiles/:id/retry', retryProfile);

module.exports = router;
