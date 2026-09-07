const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { checkNowLimiter } = require('../middleware/rateLimit');
const {
  listProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  deleteProfilesBatch,
  checkNow
} = require('../controllers/profileController');

const router = express.Router();
router.use(requireAuth);

router.get('/', listProfiles);
router.post('/', createProfile);
router.post('/batch-delete', deleteProfilesBatch);
router.get('/:id', getProfile);
router.put('/:id', updateProfile);
router.delete('/:id', deleteProfile);
router.post('/:id/check-now', checkNowLimiter, checkNow);

module.exports = router;
