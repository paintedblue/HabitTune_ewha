const mongoose = require('mongoose');

const userInfoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    required: true
  },
  childName: {
    type: String,
  },
  
  // 각 필드를 객체로 변경 (키워드, 색상, 이미지 설명 포함)
  likeFood: {
    keyword: { type: String, required: false },
    color: { type: String, required: false },
    image_description: { type: String, required: false },
    image_url : { type: String, required:false }
  },
  
  likeAnimalOrCharacter: {
    keyword: { type: String, required: false },
    color: { type: String, required: false },
    image_description: { type: String, required: false },
    image_url : { type: String, required:false }
  },
  
  likeColor: {
    keyword: { type: String, required: false },
    color: { type: String, required: false },
    image_description: { type: String, required: false },
    image_url : { type: String, required:false }
  },
  
  habits: [{ 
    name: { type: String, required: false },  // 습관명
    selected: { type: Boolean, default: false }  // 선택 여부
  }]
}, {
    timestamps: true  
});

// 스키마로 모델 생성
const UserInfo = mongoose.model('UserInfo', userInfoSchema);

module.exports = UserInfo;
