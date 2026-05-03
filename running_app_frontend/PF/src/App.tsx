import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NaverLogin from '@react-native-seoul/naver-login';
// @ts-ignore
import { NAVER_CLIENT_ID, NAVER_CLIENT_SECRET } from '@env';

import RootNavigator from './navigation';

const App = () => {
  // 네이버 SDK 초기화
  useEffect(() => {
    NaverLogin.initialize({
      appName: 'RunningMate',
      consumerKey: NAVER_CLIENT_ID,
      consumerSecret: NAVER_CLIENT_SECRET,
      serviceUrlSchemeIOS: 'runningapp',
      disableNaverAppAuthIOS: false,
    });
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
