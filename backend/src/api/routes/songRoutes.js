const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

// 동요 생성 (POST 요청)
router.post('/', songController.createSong);

// 동요 정보 조회 (GET 요청)
router.get('/', songController.getSong);

// 동요 삭제
router.post('/delete', songController.deleteSong);

// 동요 재생 로그 기록
router.post('/play', songController.logPlayback);

module.exports = router;
