const mongoose = require('mongoose');

const songBaseSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    lyric: {
        type: String,
        required: true
    },
    instrument: {
        type: String,  // 악기가 선택되지 않았다면 null일 수 있음
        default: null
    },
    rhythm: {
        type: String,
        default: null
    },
    mood: {
        type: String,
        default: null
    }
    }, {
    timestamps: true
});

const SongBase = mongoose.model('SongBase', songBaseSchema);

module.exports = SongBase;
