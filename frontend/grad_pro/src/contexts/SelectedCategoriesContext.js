// SelectedCategoriesContext.js
import React, { createContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 기본 카테고리 상태
const defaultCategories = {
  likeFood: false,
  likeAnimalOrCharacter: false,
  likeColor: false,
};

const defaultAuthState = {
  token: null,
  user: null,
  loading: true,
};

// 컨텍스트 생성
export const SelectedCategoriesContext = createContext(undefined);

// Provider 컴포넌트 생성
export const SelectedCategoriesProvider = ({ children }) => {
  const [selectedCategories, setSelectedCategories] = useState(defaultCategories);
  const [authState, setAuthState] = useState(defaultAuthState);

  // 앱 최초 구동 시 저장된 토큰/사용자 불러오기
  useEffect(() => {
    const hydrateAuth = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem('authToken'),
          AsyncStorage.getItem('authUser'),
        ]);
        if (storedToken && storedUser) {
          setAuthState({
            token: storedToken,
            user: JSON.parse(storedUser),
            loading: false,
          });
          return;
        }
      } catch (error) {
        console.warn('Auth hydrate 실패', error);
      }
      setAuthState((prev) => ({ ...prev, loading: false }));
    };

    hydrateAuth();
  }, []);

  // 카테고리 상태 업데이트 함수
  const updateCategory = (category) => {
    setSelectedCategories(prevCategories => ({
      ...prevCategories,
      [category]: true,  // 해당 카테고리의 값을 true로 설정
    }));
  };

  const clearCategory = () => {
    setSelectedCategories(defaultCategories);
  };

  const setAuthInfo = async ({ token, user }) => {
    try {
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('authUser', JSON.stringify(user));
    } catch (error) {
      console.warn('토큰 저장 실패', error);
    }
    setAuthState({ token, user, loading: false });
  };

  const clearAuth = async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'authUser']);
    } catch (error) {
      console.warn('토큰 제거 실패', error);
    }
    setAuthState({ ...defaultAuthState, loading: false });
    clearCategory();
  };

  return (
    <SelectedCategoriesContext.Provider
      value={{
        selectedCategories,
        updateCategory,
        clearCategory,
        authState,
        setAuthInfo,
        clearAuth,
        userId: authState.user?.id,
        childName: authState.user?.childName,
        isAuthenticated: !!authState.token && !!authState.user,
      }}
    >
      {children}
    </SelectedCategoriesContext.Provider>
  );
};
