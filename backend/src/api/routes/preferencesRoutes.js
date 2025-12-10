const express = require('express');
const router = express.Router();
const preferencesController = require('../controllers/preferencesController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.post('/', preferencesController.savePreferences);  // POST 엔드포인트
router.post('/direct', preferencesController.saveDirectPreferences);  // POST 엔드포인트
router.get('/', preferencesController.getPreferences);  // GET 엔드포인트 추가
router.post('/reset', preferencesController.resetPreferences);

module.exports = router;
