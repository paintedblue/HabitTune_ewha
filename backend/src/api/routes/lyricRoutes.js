const express = require('express');
const router = express.Router();
const lyricController = require('../controllers/lyricController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.post('/', lyricController.generateLyric);
router.get('/', lyricController.getLyric);  // GET 엔드포인트 추가

module.exports = router;
