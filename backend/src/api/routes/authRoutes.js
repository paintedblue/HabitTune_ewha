const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../../models/User");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

// 회원가입
router.post("/register-child", async (req, res) => {
  try {
    const { childName, password } = req.body;

    if (!childName || childName.trim() === "" || !password || password.trim().length < 4) {
      return res.status(400).json({ message: "이름과 4자 이상 비밀번호를 입력해주세요." });
    }

    const trimmedName = childName.trim();

    const exists = await User.findOne({ childName: trimmedName });
    if (exists) {
      return res.status(409).json({ message: "이미 존재하는 이름입니다. 로그인해주세요." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ childName: trimmedName, password: hashed });

    const token = jwt.sign(
      { userId: user._id, childName: user.childName },
      JWT_SECRET,
      { expiresIn: "14d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        childName: user.childName,
      },
    });
  } catch (err) {
    console.error("Auth register-child error:", err);
    res.status(500).json({ message: "회원가입 처리 중 오류가 발생했습니다." });
  }
});

// 로그인
router.post("/login-child", async (req, res) => {
  try {
    const { childName, password } = req.body;

    if (!childName || childName.trim() === "" || !password) {
      return res.status(400).json({ message: "아이 이름과 비밀번호를 입력해주세요." });
    }

    const trimmedName = childName.trim();

    let user = await User.findOne({ childName: trimmedName });

    // 존재하지 않으면 에러
    if (!user) {
      return res.status(404).json({ message: "존재하지 않는 이름입니다. 회원가입을 진행해주세요." });
    }

    // 기존에 비밀번호가 없던 유저는 이번 입력으로 비밀번호 설정 (마이그레이션)
    if (!user.password) {
      user.password = await bcrypt.hash(password, 10);
      await user.save();
    } else {
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "비밀번호가 올바르지 않습니다." });
      }
    }

    const token = jwt.sign(
      { userId: user._id, childName: user.childName },
      JWT_SECRET,
      { expiresIn: "14d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        childName: user.childName,
      },
    });
  } catch (err) {
    console.error("Auth login-child error:", err);
    res.status(500).json({ message: "로그인 처리 중 오류가 발생했습니다." });
  }
});

module.exports = router;
