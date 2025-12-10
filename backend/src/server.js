// backend/src/server.js

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

// ====== Load Environment Variables (.env) ======
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ====== Debug Log (필요 없으면 지워도 됨) ======
console.log("Loaded MONGODB_URI:", process.env.MONGODB_URI);
console.log("Loaded PORT:", process.env.PORT);

// ====== Import Routes ======
const authRoutes = require('./api/routes/authRoutes');
const preferencesRoutes = require('./api/routes/preferencesRoutes');
const habitRoutes = require('./api/routes/habitRoutes');
const lyricRoutes = require('./api/routes/lyricRoutes');
const instruRoutes = require('./api/routes/instruRoutes');
const songRoutes = require('./api/routes/songRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// ====== MongoDB Connect (Atlas or Local) ======
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    // 서버는 DB 연결 후에 시작
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });

// ====== Middleware ======
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ====== Basic Test Route ======
app.get('/', (req, res) => {
  res.send('JEVAL Backend + MongoDB Connected!');
});

// ====== API Routes ======
app.use('/api/auth', authRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/habit', habitRoutes);
app.use('/api/lyric', lyricRoutes);
app.use('/api/instrument', instruRoutes);
app.use('/api/song', songRoutes);

// ====== Error Handling Middleware ======
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports = app;
