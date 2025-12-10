const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
    songId: {
        type: String,
        required: true,
        unique: true
    },
    rhythm: {
        type: String,
        required: false,
    },
    mood: {
        type: String,
        required: false,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,  // SongBase의 userId
        ref: 'User',
        required: true
    },
    title: {
        type: String,  // 동요 생성 시점의 제목
        required: true
    },
    lyric: {
        type: String,  // 동요 생성 시점의 가사
        required: false
    },
    instrument: {
        type: String,  // 동요 생성 시점의 악기
        required: false
    },
    id: {
        type: String,
        required: true
    },
    created_at : {
        type: Date,  // Suno API에서 받은 created_at 값
        required: true // Suno API로부터 항상 제공되므로 필수 필드로 설정
    },
    image_url : {
        type: String, 
        required:false
    },
    audio_url: {
        type: String,
        required: false
    }
});

const Song = mongoose.model('Song', songSchema);

module.exports = Song;
