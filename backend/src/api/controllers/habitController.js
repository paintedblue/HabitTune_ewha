const UserInfo = require('../../models/userInfo');
const { saveLog } = require('./logSaver'); 

exports.getHabit = async (req, res) => {
  try {
    const { userId, childName } = req.user || {};
    if (!userId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    let user = await UserInfo.findOne({ userId });
    if (!user) {
      user = new UserInfo({ userId, childName });
    }

    res.status(200).json({ habits: user.habits });

  } catch (error) {
    console.error('Error getting habits:', error);
    res.status(500).json({ message: "Error getting habits", error });
  }
};

exports.saveHabit = async (req, res) => {
  const { userId, childName } = req.user || {};
  const { habitName } = req.body;
  
  try {
    if (!userId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    if (!habitName) {
      return res.status(400).json({ message: "습관 이름이 필요합니다." });
    }
    let user = await UserInfo.findOne({ userId });
    
    if (!user) {
      user = new UserInfo({ userId, childName });
    }

    // 기존 습관이 있는지 확인
    const existingHabit = user.habits.find(h => h.name === habitName);
    console.log('Existing habit found:', existingHabit);

    if (!existingHabit) {
      // 습관이 없으면 새로 추가하고 자동으로 선택 상태로 저장
      console.log('Habit not found, adding new habit:', habitName);
      user.habits.push({ name: habitName, selected: false });
    } else {
      // 이미 저장된 습관이 있으면 선택 상태로 업데이트
      console.log('Habit found, toggling selection state for:', habitName);
      existingHabit.selected = true;
    }
    
    await user.save();
    console.log('User saved successfully with updated habits:', user.habits);

    // 로그 저장 (한국어 설명과 details 포함)
    await saveLog(userId, `습관 '${habitName}'을/를 추가했습니다. (자동 select)`, { habitName });

    res.status(201).json({ message: 'Habit added or selected', habits: user.habits });

  } catch (error) {
    console.error('Error saving habit:', error);
    res.status(500).json({ message: 'Error saving habit', error });
  }
};

exports.toggleHabit = async (req, res) => {
  const { userId } = req.user || {};
  const { habitName } = req.body;

  try {
    if (!userId) {
      return res.status(401).json({ message: "로그인이 필요합니다." });
    }
    if (!habitName) {
      return res.status(400).json({ message: "습관 이름이 필요합니다." });
    }
    // 사용자의 데이터를 찾음
    let user = await UserInfo.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 습관 이름으로 해당 습관을 찾음
    const habit = user.habits.find(h => h.name === habitName);
    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    // 선택 상태를 토글 (true이면 false로, false이면 true로)
    habit.selected = !habit.selected;
    // 변경된 습관 상태 저장
    await user.save();

    // 로그 저장 (한국어 설명과 details 포함)
    const toggleAction = habit.selected ? '선택됨' : '선택 해제됨';  // 선택 상태에 따른 설명
    await saveLog(userId, `습관 '${habitName}'이(가) ${toggleAction} 상태로 변경되었습니다.`, { habitName, selected: habit.selected });

    // 업데이트된 습관 목록 반환
    res.status(200).json({ message: 'Habit toggled', habits: user.habits });

  } catch (error) {
    console.error('Error toggling habit:', error);
    res.status(500).json({ message: 'Error toggling habit', error });
  }
};
