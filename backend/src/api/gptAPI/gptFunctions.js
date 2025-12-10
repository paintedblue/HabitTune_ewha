const path = require("path");
const axios = require("axios");
require("dotenv").config({ path: path.resolve(__dirname, "../../../../.env") });

/**
 * GPT helper functions
 * - Keyword extraction → JSON
 * - Direct keyword → JSON
 * - Lyric generation → JSON (새로 적용)
 */

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const KEYWORD_MODEL = process.env.OPENAI_KEYWORD_MODEL || "gpt-4o-mini";
const DIRECT_KEYWORD_MODEL = process.env.OPENAI_DIRECT_KEYWORD_MODEL || KEYWORD_MODEL;
const LYRIC_MODEL = process.env.OPENAI_LYRIC_MODEL || "gpt-4o-mini";

const OPENAI_HEADERS = {
  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  "Content-Type": "application/json",
};

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not configured. Please set it in the .env file.");
}

// -------------------- Prompt builders --------------------

const createExtractPrompt = () => `... (생략: 기존 그대로 유지) ...`;

const createDirectPrompt = () => `... (생략: 기존 그대로 유지) ...`;

/* ---------------------------------------------
   NEW: JSON OUTPUT VERSION OF LYRICS PROMPT
---------------------------------------------- */
const createGPTPrompt = (
  animalCharacterKeyword,
  selectedHabits,
  colorKeyword,
  foodKeyword,
  childName = "아이",
  dislikedReason = "",
  dislikedHabit = selectedHabits
) => `
You are a warm, educational lyricist for young children (ages 3–8).  
Your task is to create a Korean children’s song in **valid JSON format**.  
The JSON must be fully valid and strictly follow the required schema below.

IMPORTANT JSON RULES (must follow):
- Output MUST be a valid JSON object (json).
- DO NOT include explanations, comments, or extra text outside JSON.
- All strings must use double quotes.
- Arrays must contain exactly four lines for verse and four lines for chorus.

--------------------
REQUIRED JSON SCHEMA
--------------------
{
  "title": "어린이용 동요 제목",
  "verse": [
    "line 1",
    "line 2",
    "line 3",
    "line 4"
  ],
  "chorus": [
    "line 1",
    "line 2",
    "line 3",
    "line 4"
  ]
}

--------------------
INPUT INFORMATION
--------------------
Child name: ${childName}
Favorite object / character: ${animalCharacterKeyword}
Favorite color: ${colorKeyword}
Favorite food: ${foodKeyword}
Disliked habit: ${selectedHabits}
Reason for disliking: ${dislikedReason || "이유 없음"}

--------------------
CONTENT RULES
--------------------
1. Create a positive, rhythmic, child-friendly Korean lyric.
2. The song must help the child feel encouraged to practice the disliked habit.
3. Include gain-framing (small try → positive effect → long-term benefit).

(A) Character modeling the habit:  
- Include a poetic line where "${animalCharacterKeyword}" is doing "${selectedHabits}"  
  showing (action/emotion + positive result).

(B) Character offering empathy & praise:
- Include a friendly dialogue-like line conveying understanding of  
  "${dislikedReason}" + gentle encouragement.

(C) Gain-framed chorus message:
- Empathy about the reason → Immediate positive effect → Long-term benefit.

4. Sound-symbolic words:
- Use only when natural (ex: 치카치카/반짝/차곡차곡/뽀득뽀득)
- Avoid random sounds (ex: 쓰윽, 톡톡, 살살)

5. Tone:
- Warm, supportive, educational, rhythmic.
- Mention color (${colorKeyword}) or food (${foodKeyword}) naturally.

--------------------
FINAL INSTRUCTION
--------------------
Return ONLY a valid JSON object following the required schema.
No additional commentary, no markdown, no explanations.
This output MUST be json.
`;

// -------------------- OpenAI wrappers --------------------

const callChatCompletion = async ({ model, system, user, responseFormat, maxTokens }) => {
  console.log("[OpenAI] Sending chat completion request", {
    model,
    hasApiKey: !!process.env.OPENAI_API_KEY,
  });

  // OpenAI JSON response_format requires the word "json" to appear in at least one message.
  const jsonHint = responseFormat ? "\n\n(Reply only with valid json.)" : "";

  const payload = {
    model,
    messages: [
      { role: "system", content: `${system}${jsonHint}` },
      { role: "user", content: `${user}${jsonHint}` },
    ],
    max_tokens: maxTokens,
  };

  // JSON 필요할 때만 추가
  if (responseFormat) {
    payload.response_format = responseFormat;
  }

  const response = await axios.post(OPENAI_CHAT_URL, payload, {
    headers: OPENAI_HEADERS,
  });

  console.log("[OpenAI] Chat completion response", {
    status: response.status,
    model,
  });

  return response.data.choices[0].message.content.trim();
};

// -------------------- Keyword Extraction (JSON) --------------------

const extractKeyword = async (sentence, field) => {
  try {
    const content = await callChatCompletion({
      model: KEYWORD_MODEL,
      system: createExtractPrompt(),
      user: `문장 : ${sentence} \n카테고리 : ${field}`,
      maxTokens: 200,
      responseFormat: { type: "json_object" },
    });
    return JSON.parse(content);
  } catch (error) {
    console.error("Error calling GPT API:", error.response?.data || error.message);
    throw error;
  }
};

// -------------------- Direct Keyword (JSON) --------------------

const directKeyword = async (value, field) => {
  try {
    const content = await callChatCompletion({
      model: DIRECT_KEYWORD_MODEL,
      system: createDirectPrompt(),
      user: `키워드 : ${value} \n카테고리 : ${field}`,
      maxTokens: 200,
      responseFormat: { type: "json_object" },
    });
    return JSON.parse(content);
  } catch (error) {
    console.error("Error calling GPT API:", error.response?.data || error.message);
    throw error;
  }
};

// -------------------- LYRICS (JSON RETURN) --------------------

const callGPTApi = async (preferences) => {
  const { likeAnimalOrCharacter, likeColor, likeFood, habits, childName, dislikedReason, dislikedHabit } = preferences;

  const animalCharacterKeyword = likeAnimalOrCharacter?.keyword || "";
  const colorKeyword = likeColor?.keyword || "";
  const foodKeyword = likeFood?.keyword || "";
  const selectedHabits =
    habits?.filter((h) => h.selected).map((h) => h.name).join(", ") || "습관 없음";

  const prompt = createGPTPrompt(
    animalCharacterKeyword,
    selectedHabits,
    colorKeyword,
    foodKeyword,
    childName || "아이",
    dislikedReason || "",
    dislikedHabit || selectedHabits
  );

  try {
    const content = await callChatCompletion({
      model: LYRIC_MODEL,
      system: prompt,
      // user 메시지는 최소 정보만
      user: `child: ${childName} / character: ${animalCharacterKeyword} / habit: ${selectedHabits}`,
      maxTokens: 500,
      responseFormat: { type: "json_object" }, // ← 🔥 JSON 강제 적용
    });

    return JSON.parse(content); // 파싱 후 객체 반환
  } catch (error) {
    console.error("Error generating lyrics:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  directKeyword,
  extractKeyword,
  createGPTPrompt,
  callGPTApi,
};
