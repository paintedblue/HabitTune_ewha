const path = require("path");
const UserInfo = require("../../models/userInfo");
const { directKeyword, extractKeyword } = require("../gptAPI/gptFunctions");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
require("dotenv").config({ path: path.resolve(__dirname, "../../../../.env") });
const { saveLog } = require("./logSaver");

/**
 * Preferences Controller
 * - Receives user preferences (food, character/animal, color) and stores GPT-enriched metadata.
 * - Generates an image for the extracted keyword using DALL·E.
 * - Exposes retrieval and reset endpoints for stored preferences.
 */

const ALLOWED_FIELDS = ["likeFood", "likeAnimalOrCharacter", "likeColor"];
const INVALID_KEYWORDS = new Set(["NaN", "error", "undefined", "none", "null", "N/A", "없음"]);
const MAX_KEYWORD_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 1500;
const MAX_IMAGE_RETRIES = 3;
const IMAGE_RETRY_BASE_DELAY_MS = 2000;
const FALLBACK_IMAGE_URL = "https://picsum.photos/seed/habittune-fallback/1024/1024";

const isAllowedField = (field) => ALLOWED_FIELDS.includes(field);
const isValidKeyword = (keyword) => keyword && !INVALID_KEYWORDS.has(keyword);

// Public: save preference using GPT keyword extraction from a sentence.
exports.savePreferences = async (req, res) => {
  return handlePreferenceSave(req, res, extractKeyword);
};

// Public: save preference using a directly provided keyword (no extraction).
exports.saveDirectPreferences = async (req, res) => {
  return handlePreferenceSave(req, res, directKeyword);
};

/**
 * Shared preference save flow used by both speech-based and direct keyword routes.
 */
const handlePreferenceSave = async (req, res, keywordGenerator) => {
  console.log("선호도 fetch 받음");
  const { field, value } = req.body;
  const { userId, childName } = req.user || {};

  if (!isAllowedField(field)) {
    return res.status(400).json({ message: "Invalid field" });
  }
  if (!userId) {
    return res.status(401).json({ message: "로그인이 필요합니다." });
  }

  try {
    const keywordPayload = await fetchKeywordWithRetries({ value, field, keywordGenerator });
    const generatedImageUrl = await generateImage(keywordPayload);
    const preferences = await upsertUserPreference(userId, childName, field, keywordPayload, generatedImageUrl);

    console.log(`'${field}' 필드의 선호 데이터로 '${keywordPayload.keyword}'가 저장되었습니다.`);
    await saveLog(userId, `'${field}' 선호 데이터가 저장되었습니다.`, {
      field,
      keyword: keywordPayload.keyword,
    });

    return res.status(201).json(preferences[field]);
  } catch (error) {
    console.error("사용자 선호 데이터를 저장하는 중 오류 발생:", error);

    const isQuotaError = typeof error?.message === "string" && error.message.includes("크레딧");
    const statusCode = isQuotaError ? 503 : 500;
    const userMessage = isQuotaError
      ? "AI 크레딧이 부족합니다. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요."
      : "사용자 선호 데이터를 저장하는 중 오류가 발생했습니다.";

    return res.status(statusCode).json({
      message: userMessage,
      error: isQuotaError ? undefined : error,
    });
  }
};

/**
 * Retry GPT keyword generation up to MAX_KEYWORD_RETRIES to avoid flaky responses.
 */
const fetchKeywordWithRetries = async ({ value, field, keywordGenerator }) => {
  let retryCount = 0;
  let parsedResponse;
  let lastError = null;

  while (retryCount < MAX_KEYWORD_RETRIES) {
    retryCount += 1;
    try {
      console.log(`GPT API 호출 시도 ${retryCount}/${MAX_KEYWORD_RETRIES}...`);
      parsedResponse = await keywordGenerator(value, field);

      if (parsedResponse?.keyword && isValidKeyword(parsedResponse.keyword)) {
        console.log("유효한 GPT 응답을 받았습니다.");
        return parsedResponse;
      }

      console.warn(
        `올바른 단어를 찾지 못했습니다. 다시 시도합니다. (${retryCount}/${MAX_KEYWORD_RETRIES})`
      );
    } catch (apiError) {
      lastError = apiError;
      const isRateLimited = apiError?.response?.status === 429;
      const isQuotaExceeded = apiError?.response?.data?.error?.code === "insufficient_quota";
      console.error(`GPT API 호출 오류 (시도 ${retryCount}):`, apiError.message);

      // 크레딧/쿼터 부족은 바로 중단하고 명확한 에러를 던진다.
      if (isQuotaExceeded) {
        throw new Error("OpenAI 크레딧이 부족합니다. 관리자에게 문의해주세요.");
      }

      // 429 응답이면 지수 백오프 후 재시도
      if (isRateLimited && retryCount < MAX_KEYWORD_RETRIES) {
        const waitMs = RETRY_BASE_DELAY_MS * Math.pow(2, retryCount - 1);
        console.warn(`429 Rate limit. ${waitMs}ms 대기 후 재시도합니다.`);
        await delay(waitMs);
      }
    }
  }

  // GPT가 계속 실패하면 사용자 입력을 정제해서 안전한 기본 키워드로 대체
  const fallback = buildFallbackKeywordPayload(value, field);
  console.warn(
    "GPT 키워드 추출 실패 - 사용자 입력을 기본 키워드로 사용합니다.",
    lastError?.message || ""
  );
  return fallback;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GPT가 실패했을 때 최소한 저장 가능한 키워드/컬러/이미지 설명을 만든다.
 */
const buildFallbackKeywordPayload = (rawValue, field) => {
  const trimmed = (rawValue ?? "").toString().trim();
  const safeKeyword = !trimmed || INVALID_KEYWORDS.has(trimmed) ? "기본 키워드" : trimmed;

  const color =
    field === "likeColor" && safeKeyword !== "기본 키워드" ? safeKeyword : "soft pastel colors";

  return {
    keyword: safeKeyword,
    color,
    image_description: `${safeKeyword}를 테마로 한 아동 친화적인 일러스트`,
  };
};

/**
 * Upsert the user's preference document and attach the generated image URL.
 */
const upsertUserPreference = async (userId, childName, field, parsedResponse, generatedImageUrl) => {
  let preferences = await UserInfo.findOne({ userId: userId });
  if (!preferences) {
    preferences = new UserInfo({ userId: userId, childName });
  }

  preferences[field] = {
    keyword: parsedResponse.keyword,
    color: parsedResponse.color,
    image_description: parsedResponse.image_description,
    image_url: generatedImageUrl,
  };

  await preferences.save();
  return preferences;
};

/**
 * Generate an image URL for a keyword using DALL·E.
 */
const generateImage = async (parsedResponse) => {
  const { keyword, color, image_description } = parsedResponse;

  const prompt = `
  You are an illustrator who creates child-safe images based on the keyword: "${keyword}".
Use the image description (“${image_description}.”) as the core visual guide.
The overall color palette should incorporate the color ${color}.

IMPORTANT SAFETY & STYLE REQUIREMENTS:
1. The illustration must be warm, gentle, cute, and emotionally safe for young children.
2. Absolutely NO frightening, disturbing, creepy, violent, dark, or horror-like elements.
3. Avoid all unsettling details such as exaggerated anatomy, distorted shapes, sharp shadows, or intense contrasts.
4. If the keyword is unusual or abstract, reinterpret it in a soft, friendly, playful, and imaginative way suitable for children.
5. The image must NOT include humans or human-like figures.
6. Do NOT include realistic or threatening animals; portray everything in a friendly, rounded, soft-edged cartoon style.
7. The environment should feel bright, positive, and comforting—similar to illustrations found in high-quality children’s picture books.
8. Avoid clutter; keep the visual composition simple and easy for children to understand.
9. No text, letters, symbols, logos, or culturally sensitive elements.

OUTPUT STYLE:
- Soft colors, rounded shapes, gentle lighting.
- Cute, safe, child-friendly visual tone.
- No discomfort, no fear triggers, no mature or complex themes.
- The final image should make a child feel happy, safe, and curious.

  Create the illustration following these rules.

  `;

  let attempt = 0;
  let lastError = null;

  while (attempt < MAX_IMAGE_RETRIES) {
    attempt += 1;
    try {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: "dall-e-3",
          n: 1,
          size: "1024x1024",
        }),
      });

      console.log("[OpenAI] Image generation response status:", response.status);

      const raw = await response.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch (parseErr) {
        console.error(
          "Error parsing OpenAI image response:",
          parseErr.message,
          "body:",
          raw?.slice(0, 200)
        );
        throw new Error("이미지 생성 응답을 해석하지 못했습니다.");
      }

      if (!response.ok) {
        const msg = data?.error?.message || `HTTP ${response.status}`;
        console.error("OpenAI DALL·E API Error:", msg);
        throw new Error(msg);
      }

      if (!data?.data?.[0]?.url) {
        throw new Error("OpenAI 이미지 URL을 찾지 못했습니다.");
      }

      return data.data[0].url;
    } catch (error) {
      lastError = error;
      console.error(
        `Error generating image (attempt ${attempt}/${MAX_IMAGE_RETRIES}):`,
        error.message
      );

      if (attempt < MAX_IMAGE_RETRIES) {
        const waitMs = IMAGE_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await delay(waitMs);
      }
    }
  }

  console.warn(
    "이미지 생성이 반복적으로 실패하여 기본 이미지를 사용합니다.",
    lastError?.message || ""
  );
  return FALLBACK_IMAGE_URL;
};

/**
 * Retrieve stored preferences. userId and habits are returned separately, everything else is grouped under preferences.
 */
exports.getPreferences = async (req, res) => {
  try {
    const { userId } = req.user || {};
    if (!userId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    const user = await UserInfo.findOne({ userId: userId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { habits, userId: id, ...preferences } = user.toObject();
    return res.status(200).json({ userId: id, preferences });
  } catch (error) {
    console.error("Error getting preferences:", error);
    return res.status(500).json({ message: "Error getting preferences", error });
  }
};

/**
 * Reset one or all preference fields back to empty values.
 */
exports.resetPreferences = async (req, res) => {
  try {
    const { field } = req.body;
    const { userId } = req.user || {};
    if (!userId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    const user = await UserInfo.findOne({ userId: userId });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!field) {
      ALLOWED_FIELDS.forEach((allowedField) => {
        user[allowedField] = {
          keyword: null,
          color: null,
          image_description: null,
          image_url: null,
        };
      });
    } else {
      user[field] = {
        keyword: null,
        color: null,
        image_description: null,
        image_url: null,
      };
    }

    await user.save();

    if (!field) {
      return res.status(201).json({ message: "All preferences have been reset." });
    }

    return res.status(201).json({
      message: `Preferences for field '${field}' have been reset.`,
      field: user[field],
    });
  } catch (error) {
    console.error("Error resetting preferences:", error);
    return res.status(500).json({
      message: "Error resetting user preferences",
      error: error.message,
    });
  }
};
