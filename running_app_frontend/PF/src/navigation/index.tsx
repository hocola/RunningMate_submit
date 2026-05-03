import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import TabNavigator from './TabNavigator';
import LoginScreen from '../screens/LoginScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CompletionScreen from '../screens/CompletionScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';
import RoomLobbyScreen from '../screens/RoomLobbyScreen';
import TeamRecordScreen from '../screens/TeamRecordScreen';
import RoomRunningScreen from '../screens/RoomRunningScreen';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          setInitialRoute('Main');
        }
      } catch (e) {
        console.error('Token check failed', e);
      } finally {
        setLoading(false);
      }
    };

    checkLogin();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Completion" component={CompletionScreen} />
      <Stack.Screen name="RecordDetail" component={RecordDetailScreen} />
      <Stack.Screen name="RoomLobby" component={RoomLobbyScreen} />
      <Stack.Screen name="TeamRecord" component={TeamRecordScreen} />
      <Stack.Screen name="RoomRunning" component={RoomRunningScreen} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
