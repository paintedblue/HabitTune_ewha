const { createExtractPrompt, extractKeyword, createGPTPrompt, callGPTApi } = require('./gptFunctions');
require('dotenv').config({ path: '../../../.env' }); // 환경 변수 사용을 위해 dotenv 모듈 사용
console.log('OpenAI API Key:', process.env.OPENAI_API_KEY);
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, {
}).then(() => {
  console.log("MongoDB connected successfully!");
}).catch(err => {
  console.error("MongoDB connection error:", err);
});

const UserInfo = require('../../models/userInfo'); 

// 환경 변수가 제대로 로드되었는지 확인
console.log('Loaded OPENAI_API_KEY:', process.env.OPENAI_API_KEY);

// 응답을 JSON 형식으로 파싱하는 함수
const parseGptResponse = (response) => {
  try {
    // 필요한 부분을 추출
    const startIndex = response.indexOf('{');
    const endIndex = response.lastIndexOf('}') + 1;
    const jsonString = response.slice(startIndex, endIndex);

    // JSON으로 파싱
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Failed to parse JSON response: ' + error.message);
  }
};

// 테스트 함수
const testGPTPrompt = async () => {
  try {
    // 프롬프트 생성
    const userInfo = await UserInfo.findOne({ userId: 'testUser123' });
    if (!userInfo) {
      console.log("No user found with the given userId.");
      return;
    }

    const prompt = createGPTPrompt(userInfo);
    //console.log("Generated Prompt:\n", prompt);

    // GPT API 호출
    const gptResponse = await callGPTApi(prompt);

    // 응답 출력
    console.log("GPT Response:\n", gptResponse);

    // 응답을 JSON 형식으로 파싱
    const responseJson = parseGptResponse(gptResponse);

    // 각 부분을 출력
    console.log("GPT Response - 제목:", responseJson.title);
    console.log("GPT Response - 가사:", responseJson.lyric);
  } catch (error) {
    console.error('Error during test:', error.message);
  }
};

const testKeyword = async () => {
  try {
    const sentence = "나는 고양이";

    // 프롬프트 생성
    const prompt = createExtractPrompt(sentence, "likeAnimal");  // 필드명 추가
    console.log("Generated Prompt:\n", prompt);

    // GPT API 호출
    const gptResponse = await extractKeyword(prompt);

    // 응답 출력
    // console.log("GPT Response:\n", gptResponse);

    // GPT의 응답이 정확한 JSON 형식이 아닌 JavaScript 객체 형식으로 오는 것 같음.
    // 응답이 JavaScript 객체 형식 ({ keyword: '코끼리', color: '#808080', ... })으로 오기 때문에, JSON.parse()로 바로 파싱할 수 없다.

    const responseString = JSON.stringify(gptResponse);  // 객체를 문자열로 변환
    const fixedResponse = responseString
      .replace(/(\w+):/g, '"$1":')  // 필드 이름에 따옴표 추가
      .replace(/'/g, '"');  // 작은따옴표를 큰따옴표로 변경

    // 정규화된 응답을 JSON으로 파싱
    const parsedResponse = JSON.parse(fixedResponse);

    console.log("Parsed GPT Response:\n", parsedResponse);

  } catch (error) {
    console.error('Error during testKeyword:', error.message);
  }
};

// 테스트 실행
testGPTPrompt();

// testKeyword();