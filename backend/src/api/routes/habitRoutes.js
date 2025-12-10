const express = require('express');
const router = express.Router();
const habitController = require('../controllers/habitController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.get('/', habitController.getHabit);  // 저장된 습관 및 선택된 습관 불러오기
router.post('/', habitController.saveHabit);  // 새로운 습관 저장 및 선택
router.post('/toggle', habitController.toggleHabit);  // 습관 선택/해제

module.exports = router;
