import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NaverLogin from '@react-native-seoul/naver-login';
import { authApi } from '../api/authApi';

const LoginScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const handleNaverLogin = async () => {
    setLoading(true);
    try {
      // 1. 네이버 앱 설치 여부 확인 (선택 사항)
      // const isInstalled = await checkNaverAppInstalled();
      // if (!isInstalled) { ... } // 필요 시 주석 해제하여 사용

      // 2. 네이버 로그인 시도
      const { failureResponse, successResponse } = await NaverLogin.login();

      if (successResponse) {
        console.log("네이버 로그인 성공:", successResponse.accessToken);

        // 3. 백엔드 서버로 로그인 요청
        const authResponse = await authApi.socialLogin('naver', successResponse.accessToken);

        console.log("백엔드 응답 성공:", authResponse);

        // 4. 로컬 스토리지에 토큰 및 유저 정보 저장
        await AsyncStorage.setItem('accessToken', authResponse.accessToken);
        await AsyncStorage.setItem('user', JSON.stringify(authResponse.user));

        // 5. 메인 화면으로 이동
        navigation.reset({
            index: 0,
            routes: [{ name: 'Main' as never }],
        });
      } else {
        console.log("네이버 로그인 실패 또는 취소", failureResponse);
        setLoading(false);
      }
    } catch (error: any) {
      console.error("로그인 에러 발생:", error);
      
      // 에러 메시지 사용자 표시
      let message = '로그인 중 문제가 발생했습니다.';
      if (error.response) {
          // 서버에서 에러 응답이 온 경우
          message = `서버 오류: ${error.response.status}`;
      } else if (error.message) {
          message = error.message;
      }
      
      Alert.alert('로그인 실패', message);
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?q=80&w=2074&auto=format&fit=crop' }}
      style={styles.backgroundImage}
    >
      <SafeAreaView style={styles.welcomeContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.welcomeTitle}>환영합니다!</Text>
          <Text style={styles.welcomeSubtitle}>러닝 메이트와 함께 달려보세요</Text>
        </View>

        <TouchableOpacity
          style={styles.naverButton}
          onPress={handleNaverLogin}
          disabled={loading}
        >
          <View style={styles.iconWrapper}>
              <Text style={styles.naverIconText}>N</Text>
          </View>
          <Text style={styles.naverButtonText}>
            {loading ? '서버 연결 중...' : '네이버 아이디로 로그인'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 50,
    backgroundColor: 'rgba(0,0,0,0.3)', 
  },
  textContainer: {
    marginTop: 100,
    paddingHorizontal: 30,
  },
  welcomeTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#eee',
  },
  naverButton: {
    backgroundColor: '#03C75A',
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 30,
    paddingVertical: 15,
    paddingLeft: 30,
    borderRadius: 6,
    elevation: 3,
  },
  iconWrapper: {
    width: 30,
    height: 30,
    backgroundColor: '#fff',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
    marginRight: 15,
  },
  naverIconText: {
    color: '#03C75A',
    fontWeight: 'bold',
    fontSize: 18,
  },
  naverButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LoginScreen;