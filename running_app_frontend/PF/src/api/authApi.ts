import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: 토큰 자동 추가
apiClient.interceptors.request.use(async (config) => {
  try {
    // AsyncStorage에서 토큰 조회
    const token = await AsyncStorage.getItem('accessToken');
    if (token && token.trim() !== '') {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.error('Token retrieval error:', e);
  }
  return config;
});

// 응답 인터셉터: 204 No Content 및 header 관련 에러 처리
apiClient.interceptors.response.use(
  (response) => response, // 성공 응답 처리
  (error) => {
    // React Native에서 204 응답 또는 header 관련 에러 무시
    if (error?.response?.status === 204) {
      return Promise.resolve({ data: null, status: 204 });
    }
    if (error?.message?.includes('header name')) {
      return Promise.resolve({ data: null, status: 200 });
    }
    return Promise.reject(error); // 에러 응답 처리
  }
);
// provider: kakao, naver 등
// accessToken: 소셜 서비스 인증 토큰
export const authApi = {
  socialLogin: async (provider: string, accessToken: string) => {
    try {
      const response = await apiClient.post('/auth/social/login', {
        provider,
        accessToken,
      });
      return response.data;
    } catch (error) {
      console.error('Social Login Error:', error);
      throw error;
    }
  },
};
