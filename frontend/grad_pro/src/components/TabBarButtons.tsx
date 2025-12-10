import React, { useContext, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SelectedCategoriesContext } from "../contexts/SelectedCategoriesContext"; // 컨텍스트 임포트
import api from '../utils/api';

const Header: React.FC = () => {
  const { selectedCategories, clearCategory, userId, isAuthenticated, clearAuth, childName } = useContext(SelectedCategoriesContext);
  const navigation = useNavigation(); // navigation 객체 사용
  const [showProfile, setShowProfile] = useState(false);

  const goToHome = async () => {
    if (!isAuthenticated) {
      navigation.navigate('LoginScreen');
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'HomeScreen' }],
    }); // 처음 화면으로 완전 초기화 이동
    clearCategory();
  };

  const goToHabit = () => {
    navigation.navigate('HabitScreen', { userId }); // 습관 화면으로 이동
  };

  const goToLyricMake = () => {
    navigation.navigate('LyricSelectScreen', { userId }); // 가사 생성 화면으로 이동
  };

  const goToMelody = () => {
    navigation.navigate('MelodyScreen', { userId }); // 멜로디 화면으로 이동
  };

  const goToPlay = () => {
    //navigation.navigate('PlayScreen', { userId }); // 동요 완성 화면으로 이동
  };

  const toggleProfile = () => {
    if (!isAuthenticated) {
      navigation.navigate('LoginScreen');
      return;
    }
    setShowProfile((prev) => !prev);
  };

  const handleLogout = async () => {
    await clearAuth();
    setShowProfile(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'LoginScreen' }],
    });
  };

  return (
    <View>
      {/* 상단 헤더 */}
      <View style={styles.headerContainer}>
        {/* 좌측 홈 버튼 */}
        <TouchableOpacity onPress={goToHome} style={styles.homeIconContainer}>
          <Image
            source={require('../assets/imgs/home.png')}
            style={styles.homeIcon}
          />
        </TouchableOpacity>

        {/* 타이틀 */}
        <Text style={styles.appTitle}>꿈가락</Text>

        {/* 우측 프로필 버튼 */}
        <TouchableOpacity onPress={toggleProfile} style={styles.profileButton}>
          <Text style={styles.profileText}>{(childName || "👤").slice(0, 1)}</Text>
        </TouchableOpacity>
      </View>

      {showProfile && (
        <View style={styles.profileOverlay}>
          <TouchableOpacity style={styles.overlayBg} onPress={() => setShowProfile(false)} />
          <View style={styles.profileCard}>
            <Text style={styles.profileTitle}>내 계정</Text>
            <Text style={styles.profileItem}>이름: {childName || "로그인 필요"}</Text>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 탭바 버튼들 */}
      <View style={styles.tabBarButtons}>
        <TouchableOpacity onPress={goToHabit} style={styles.tab}>
          <Text style={styles.symbol}>⏰</Text>
          <Text style={styles.label}>습관</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToLyricMake} style={styles.tab}>
          <Text style={styles.symbol}>📃</Text>
          <Text style={styles.label}>가사</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToMelody} style={styles.tab}>
          <Text style={styles.symbol}>🎶</Text>
          <Text style={styles.label}>악기</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToPlay} style={styles.tab}>
          <Text style={styles.symbol}>✅</Text>
          <Text style={styles.label}>동요 완성!</Text>
        </TouchableOpacity>
      </View>

      {/* 탭바 하단 구분선 */}
      <View style={styles.line} />
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // 좌·우 끝 + 가운데 타이틀
    width: '100%',
    height: 50,
    backgroundColor: '#A5BEDF',
    paddingHorizontal: 20,
  },
  homeIconContainer: {
    width: 30,
    height: 30,
    justifyContent: 'center',
  },
  homeIcon: {
    width: 30,
    height: 30,
  },
  appTitle: {
    fontSize: 25,
    fontFamily: "Jua-Regular",
    color: '#FFF',
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    textAlign: 'center',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  profileText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Jua-Regular',
  },
  tabBarButtons: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#A5BEDF',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 70,
    flexDirection: 'column',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Jua-Regular',
    textAlign: 'center',
    marginTop: 5,
  },
  symbol: {
    fontSize: 24,
    fontWeight: '500',
    fontFamily: 'Jua-Regular',
    color: '#999',
    textAlign: 'center',
  },
  line: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.25)',
    height: 1,
  },
  profileOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  overlayBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  profileCard: {
    marginTop: 60,
    marginRight: 12,
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  profileTitle: {
    fontSize: 16,
    marginBottom: 8,
    color: '#1B2B3C',
    fontFamily: 'Jua-Regular',
  },
  profileItem: {
    fontSize: 14,
    color: '#3C4A5E',
    marginBottom: 12,
  },
  logoutButton: {
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f2f7',
    alignItems: 'center',
  },
  logoutText: {
    color: '#1B2B3C',
    fontSize: 14,
  },
});

export default Header;
