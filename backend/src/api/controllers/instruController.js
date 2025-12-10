const mongoose = require('mongoose');
const SongBase = require('../../models/songBase');
const { saveLog } = require('./logSaver'); 


// 악기 선택 (POST 요청)
exports.selectInstrument = async (req, res) => {
    const { userId } = req.user || {};
    const { instrument, rhythm, mood } = req.body;

    try {
        if (!userId) {
            return res.status(401).json({ message: "로그인이 필요합니다." });
        }
        // userId로 SongBase 찾기
        let songBase = await SongBase.findOne({ userId });

        // SongBase가 없으면 에러 반환
        if (!songBase) {
        return res.status(404).json({ message: "해당 사용자의 곡을 찾을 수 없습니다." });
        }

        // 전달된 필드 업데이트
        if (instrument) {
            songBase.instrument = instrument;
        }
        if (rhythm) {
            songBase.rhythm = rhythm;
        }
        if (mood) {
            songBase.mood = mood;
        }
        await songBase.save();

        // 로그 저장 (한국어 설명과 details 포함)
        await saveLog(userId, `선택 정보가 업데이트되었습니다.`, { instrument, rhythm, mood });

        res.status(200).json({ userId, instrument: songBase.instrument, rhythm: songBase.rhythm, mood: songBase.mood });
    } catch (error) {
        console.error('악기 선택 중 오류 발생:', error);
        res.status(500).send('악기 선택 중 오류 발생');
    }
};

// 악기 정보 조회 (GET 요청)
exports.getInstrument = async (req, res) => {
    const { userId } = req.user || {};

    try {
        if (!userId) {
            return res.status(401).json({ message: "로그인이 필요합니다." });
        }
        // userId로 SongBase 찾기
        const songBase = await SongBase.findOne({ userId });

        // SongBase가 없으면 에러 반환
        if (!songBase) {
        return res.status(404).json({ message: "해당 사용자의 곡을 찾을 수 없습니다." });
        }

        // 악기 정보 반환
        res.status(200).json({ instrument: songBase.instrument });
    } catch (error) {
        console.error('악기 조회 중 오류 발생:', error);
        res.status(500).send('악기 조회 중 오류 발생');
    }
};
