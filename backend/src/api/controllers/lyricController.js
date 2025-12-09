const mongoose = require('mongoose'); 
const { callGPTApi, createGPTPrompt } = require('../gptAPI/gptFunctions');
const SongBase = require('../../models/songBase');
const UserInfo = require('../../models/userInfo');
const { saveLog } = require('./logSaver'); 

// GPT 응답(객체/문자열)을 제목/가사 문자열로 정규화
const normalizeLyricResponse = (gptResponse) => {
    if (gptResponse && typeof gptResponse === "object") {
        const title = gptResponse.title || "무제 동요";
        const verseLines = Array.isArray(gptResponse.verse) ? gptResponse.verse.filter(Boolean) : [];
        const chorusLines = Array.isArray(gptResponse.chorus) ? gptResponse.chorus.filter(Boolean) : [];
        const fallbackLyric = typeof gptResponse.lyric === "string" ? gptResponse.lyric : "";

        const verse = verseLines.length ? ["[Verse]", ...verseLines] : [];
        const chorus = chorusLines.length ? ["[Chorus]", ...chorusLines] : [];
        const lyricBody = [...verse, ...chorus].join("\n").trim();

        return {
            title,
            lyric: lyricBody || fallbackLyric || "가사를 생성하지 못했습니다.",
        };
    }

    if (typeof gptResponse === "string" || gptResponse instanceof String) {
        const str = String(gptResponse);
        try {
            const parsed = JSON.parse(str);
            return normalizeLyricResponse(parsed);
        } catch (_jsonErr) {
            const titleMatch = str.match(/"title"\s*:\s*"([^"]+)"/s);
            const lyricMatch = str.match(/"lyric"\s*:\s*"(.*?)"/s); 

            if (titleMatch && lyricMatch) {
                const rawLyric = lyricMatch[1].trim().replace(/\\n/g, '\n').replace(/\./g, '\n');
                return { title: titleMatch[1].trim(), lyric: rawLyric };
            }
        }
    }

    throw new Error("Invalid GPT lyric response format");
};


exports.generateLyric = async (req, res) => {
    const { userId } = req.user || {};

    try {
        if (!userId) {
            return res.status(401).json({ message: "로그인이 필요합니다." });
        }
        let preferences = await UserInfo.findOne({ userId: userId });
        console.log(preferences);
        if (!preferences) {
            return res.status(404).json({ message: "User not found" });
        };
        const gptResponse = await callGPTApi(preferences);
        const { title, lyric } = normalizeLyricResponse(gptResponse);


        // console.log("title : " + title);
        // console.log("lyric : " + lyric);

        // 사용자의 SongBase 문서 찾기 또는 새로 생성
        let songBase = await SongBase.findOne({ userId });
        if (!songBase) {
            // 새 SongBase 생성
            songBase = new SongBase({ userId, title, lyric });
        } else {
            // 기존 SongBase 업데이트
            songBase.title = title;
            songBase.lyric = lyric;
        }

        // DB에 저장
        await songBase.save();

        // 로그 저장 (한국어 설명과 details 포함)
        await saveLog(userId, `'${title}' 제목의 가사를 생성했습니다.`, { title, lyric });

        res.json({ title: songBase.title, lyric: songBase.lyric });

    } catch (error) {
        console.error('Error generating lyrics:', error);
        res.status(500).send(error.message);
    }
};


exports.getLyric = async (req, res) => {
    try {
        const { userId } = req.user || {};
        if (!userId) {
            return res.status(401).json({ message: "로그인이 필요합니다." });
        }

        // 사용자의 SongBase 문서 찾기
        const userSong = await SongBase.findOne({ userId });
        if (!userSong) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(userSong);
    } catch (error) {
        console.error('Error getting lyrics:', error);
        res.status(500).json({ message: "Error getting lyrics", error });
    }
};
