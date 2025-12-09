const express = require('express');
const router = express.Router();
const instruController = require('../controllers/instruController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

// 악기 선택 (POST 요청)
router.post('/', instruController.selectInstrument);

// 악기 정보 조회 (GET 요청)
router.get('/', instruController.getInstrument);

module.exports = router;
