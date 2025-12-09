const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true  // 사용자 ID
    },
    action: {
        type: String,
        required: true  // 사용자의 행동을 설명하는 한국어 설명 (예: '사용자가 ~~을 저장했습니다')
    },
    details: {
        type: mongoose.Schema.Types.Mixed,  // 추가적인 정보를 담는 필드 (optional)
        required: false  // 필수가 아님
    }
}, {
    timestamps: true  // createdAt, updatedAt 자동 생성
});

const Log = mongoose.model('Log', logSchema);

module.exports = Log;
