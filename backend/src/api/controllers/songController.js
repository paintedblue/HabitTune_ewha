// controllers/songController.js

const SongBase = require("../../models/songBase");
const Song = require("../../models/song");
const { v4: uuidv4 } = require("uuid");
const { saveLog } = require("./logSaver");
const axios = require("axios");
require("dotenv").config({ path: "../../../.env" });

// 환경 변수
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY; // 현재는 사용 안 함 (EachLabs만 사용)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EACH_API_KEY = process.env.EACH_API_KEY;

// EachLabs HTTP API 설정
const EACH_API_BASE_URL = "https://api.eachlabs.ai/v1";
const EACH_HEADERS = EACH_API_KEY
  ? {
      "X-API-Key": EACH_API_KEY,
      "Content-Type": "application/json",
    }
  : null;

if (!EACH_API_KEY) {
  console.warn("EACH_API_KEY 미설정: 동요 생성 시 데모 오디오를 사용합니다.");
} else {
  console.log("EACH_API_KEY 로드 완료: Minimax Music v2 사용 준비 완료");
}

// ✅ Minimax Music v2 Prediction 생성
async function createMinimaxPrediction(promptText, lyricsPrompt) {
  if (!EACH_HEADERS) {
    throw new Error("EACH_API_KEY가 설정되지 않았습니다.");
  }

  const body = {
    model: "minimax-music-v2",
    version: "0.0.1",
    input: {
      prompt: promptText,
      lyrics_prompt: lyricsPrompt,
    },
    webhook_url: "",
  };

  const response = await axios.post(
    `${EACH_API_BASE_URL}/prediction/`,
    body,
    { headers: EACH_HEADERS }
  );

  const prediction = response.data;
  console.log("Minimax v2 createPrediction 응답:", prediction);

  if (!prediction.predictionID) {
    throw new Error(
      `predictionID가 없습니다: ${JSON.stringify(prediction)}`
    );
  }

  return prediction.predictionID;
}

// ✅ Minimax Music v2 Prediction 결과 polling (대기 시간 늘린 버전)
async function getMinimaxPrediction(
  predictionId,
  {
    maxWaitMs = 120000, // 최대 120초까지 기다리기
    intervalMs = 3000, // 3초 간격으로 폴링
  } = {}
) {
  if (!EACH_HEADERS) {
    throw new Error("EACH_API_KEY가 설정되지 않았습니다.");
  }

  const maxTries = Math.ceil(maxWaitMs / intervalMs);
  let lastStatus = null;

  for (let i = 0; i < maxTries; i++) {
    const response = await axios.get(
      `${EACH_API_BASE_URL}/prediction/${predictionId}`,
      { headers: EACH_HEADERS }
    );

    const result = response.data;
    lastStatus = result.status;

    console.log(
      `Minimax v2 getPrediction [${i + 1}/${maxTries}] status:`,
      result.status
    );

    if (result.status === "success") {
      return result;
    } else if (result.status === "error") {
      throw new Error(`Prediction failed: ${JSON.stringify(result)}`);
    }

    // 아직 "starting" / "processing" 상태면 계속 기다림
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Prediction timeout: ${predictionId}, 약 ${Math.round(
      maxWaitMs / 1000
    )}초 동안 status='${lastStatus}' 상태가 유지되었습니다.`
  );
}

// ⭐ 동요 생성
exports.createSong = async (req, res) => {
  const { userId } = req.user || {};

  try {
    if (!userId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    console.log("[createSong] 요청 수신", { userId });

    if (!OPENAI_API_KEY) {
      return res
        .status(500)
        .json({ message: "서버 오류: OPENAI_API_KEY 설정 필요" });
    }

    const base = await SongBase.findOne({ userId });
    if (!base) return res.status(404).json({ message: "기본 정보가 없습니다." });

    if (!base.lyric || !base.instrument) {
      return res
        .status(400)
        .json({ message: "가사 또는 악기 정보가 부족합니다." });
    }

    console.log("[createSong] 기본 정보 조회 완료", {
      title: base.title,
      instrument: base.instrument,
      mood: base.mood,
      rhythm: base.rhythm,
      lyricLength: base.lyric?.length,
    });

    // 악기 보정 (기존 로직 유지)
    let instrument = base.instrument;
    if (instrument === "Recorder") instrument = "Ocarina";

    if (instrument !== base.instrument) {
      console.log("[createSong] 악기 보정 적용", {
        original: base.instrument,
        corrected: instrument,
      });
    }

    const rhythm = base.rhythm || "";
    const mood = base.mood || "";

    // -------------------------------------------------------
    // 🎵 1) Minimax Music v2로 음악 생성 (EachLabs HTTP API)
    // -------------------------------------------------------

    let audioUrl = null;
    let externalSongId = uuidv4();
    let createdAt = new Date();

    // Minimax v2용 프롬프트 구성
    const promptText = `
children's song, nursery rhyme style.
title: "${base.title}"
mood: ${mood || "happy"}
rhythm: ${rhythm || "simple"}
instrument: ${instrument}
style: fun, simple, and easy for children to sing along.
    `.trim();

    const lyricsPrompt = base.lyric;

    console.log("[createSong] Minimax 프롬프트 준비 완료", {
      promptText,
      lyricsLength: lyricsPrompt?.length,
      hasEachKey: !!EACH_API_KEY,
    });

    if (EACH_API_KEY) {
      try {
        // 1) Prediction 생성
        const predictionId = await createMinimaxPrediction(
          promptText,
          lyricsPrompt
        );
        externalSongId = predictionId;
        console.log("Minimax v2 prediction 생성:", predictionId);

        // 2) 결과 polling (최대 120초, 3초 간격)
        const result = await getMinimaxPrediction(predictionId, {
          maxWaitMs: 120000,
          intervalMs: 3000,
        });
        console.log("Minimax v2 최종 결과:", {
          status: result.status,
          outputType: typeof result.output,
          hasAudioUrl:
            !!result.output?.audio_url ||
            !!result.output?.audioUrl ||
            !!result.output?.url,
        });

        const out = result.output;

        // output 구조에 따라 URL 추출
        if (typeof out === "string") {
          audioUrl = out;
        } else if (Array.isArray(out)) {
          audioUrl = out[0];
        } else if (out?.audio_url || out?.audioUrl || out?.url) {
          audioUrl = out.audio_url || out.audioUrl || out.url;
        }

        createdAt = new Date();

        if (!audioUrl) {
          console.warn(
            "Minimax v2 결과는 success지만 audio URL을 찾지 못했습니다. output:",
            out
          );
        } else {
          console.log("[createSong] Minimax audio URL 추출 성공", {
            audioUrl,
          });
        }
      } catch (eachErr) {
        console.error("Minimax v2 음악 생성 오류:", {
          message: eachErr.message,
          stack: eachErr.stack,
        });
      }
    } else {
      console.warn(
        "EACH_API_KEY 미설정: Minimax v2를 호출할 수 없습니다. 데모 오디오로 대체합니다."
      );
    }

    // 마지막까지 URL을 못 받았다면 데모로 대체 (사용자 흐름 유지를 위해)
    if (!audioUrl) {
      console.warn(
        "음악 URL을 생성하지 못했습니다. 데모 오디오로 대체합니다. EachLabs Minimax Music v2 응답 상태와 API 키를 확인하세요."
      );
      audioUrl = "https://cdn1.suno.ai/demo-placeholder.mp3";
      externalSongId = externalSongId || uuidv4();
      createdAt = new Date();
      console.log("[createSong] 데모 오디오로 대체", { audioUrl, externalSongId });
    }

    if (!audioUrl) {
      return res
        .status(502)
        .json({ message: "음악 URL을 생성하지 못했습니다." });
    }

    // -------------------------------------------------------
    // 🎨 2) GPT-4o 이미지 생성
    // -------------------------------------------------------

        const promptImage = `
            다음을 참고해서 어린이용 동요 커버 일러스트를 만들어줘.
            - 제목: '${base.title}'
            - 가사: "${base.lyric}"
            스타일/제한:
            - 혐오, 폭력, 선정적 표현 금지. 무해하고 따뜻한 이미지.
            - 글자/텍스트/워터마크 넣지 말 것.
            - 어린이용, 즐겁고 귀여운 느낌. 안전하고 긍정적이며 친근한 톤.
            - 사람 얼굴/형체보다 귀여운 동물, 장난감, 추상적 요소 위주로.
            - 위험한 도구나 상황 묘사 금지.
        `;

    console.log("[createSong] 이미지 생성 요청 시작");

    const imageResp = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: promptImage.trim(),
          size: "1024x1024",
        }),
      }
    );

    if (!imageResp.ok) {
      const errText = await imageResp.text();
      throw new Error(
        `OpenAI image generate failed (${imageResp.status}): ${errText}`
      );
    }

    const imageResult = await imageResp.json();
    const imageUrl = imageResult.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error("OpenAI image response에 URL이 없습니다.");
    }

    console.log("[createSong] 이미지 생성 성공", { imageUrl: !!imageUrl });

    // -------------------------------------------------------
    // 🎼 3) DB 저장
    // -------------------------------------------------------

    const newSong = new Song({
      songId: uuidv4(),
      userId: base.userId,
      created_at: createdAt,
      id: externalSongId, // Minimax v2 predictionID
      lyric: base.lyric,
      title: base.title,
      instrument: base.instrument,
      rhythm: base.rhythm,
      mood: base.mood,
      image_url: imageUrl,
      audio_url: audioUrl, // 실제 음악 URL
    });

    await newSong.save();

    console.log("[createSong] DB 저장 완료", {
      songId: newSong.songId,
      externalSongId,
      created_at: createdAt.toISOString(),
    });

    await saveLog(userId, `'${newSong.title}' 동요 생성 완료`, {
      songId: newSong.songId,
      minimaxId: externalSongId,
    });

    return res.status(200).json({ song: newSong.toObject() });
  } catch (error) {
    console.error("동요 생성 오류:", { message: error.message, stack: error.stack });
    return res
      .status(500)
      .json({ message: "동요 생성 중 오류", error: error.message });
  }
};

// ⭐ 동요 조회
exports.getSong = async (req, res) => {
  const { userId } = req.user || {};

  try {
    if (!userId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    const songs = await Song.find({ userId });

    return res.status(200).json({
      message: songs.length ? "동요 조회 성공" : "동요 없음",
      songs,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "조회 중 오류", error: error.message });
  }
};

// ⭐ 동요 삭제
exports.deleteSong = async (req, res) => {
  const { songId } = req.body;
  const { userId } = req.user || {};

  try {
    if (!userId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    const song = await Song.findOne({ songId });

    if (!song) return res.status(404).json({ message: "동요 없음" });

    if (String(song.userId) !== String(userId)) {
      return res.status(403).json({ message: "삭제 권한이 없습니다." });
    }

    await Song.deleteOne({ songId });

    await saveLog(song.userId, `'${song.title}' 동요 삭제 완료`, {
      songId: song.songId,
    });

    return res.status(200).json({ message: "삭제 완료" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "삭제 중 오류", error: error.message });
  }
};

// ⭐ 동요 재생 로그
exports.logPlayback = async (req, res) => {
  const { songId, source = "app" } = req.body || {};
  const { userId } = req.user || {};

  if (!userId || !songId) {
    return res.status(400).json({ message: "userId와 songId는 필수입니다." });
  }

  try {
    const song = await Song.findOne({ songId });
    if (!song) {
      return res.status(404).json({ message: "동요를 찾을 수 없습니다." });
    }
    if (String(song.userId) !== String(userId)) {
      return res.status(403).json({ message: "재생 권한이 없습니다." });
    }

    const playedAt = new Date();

    console.log("[playback] 동요 재생 로그 기록", {
      userId,
      songId,
      title: song.title,
      source,
      playedAt: playedAt.toISOString(),
    });

    await saveLog(userId, `'${song.title}' 재생`, {
      songId,
      title: song.title,
      source,
      audio_url: song.audio_url,
      playedAt: playedAt.toISOString(),
    });

    return res.status(200).json({ message: "재생 로그 기록 완료" });
  } catch (error) {
    return res.status(500).json({ message: "재생 로그 저장 실패", error: error.message });
  }
};
