/**
 * TabNavigator (하단 탭 네비게이션)
 * 
 * - 앱의 메인 하단 탭 네비게이션 구성
 * - 각 탭별 화면 연결
 * - 친구 신청 배지 표시
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

import HomeScreen from '../screens/HomeScreen';
import FriendsScreen from '../screens/FriendsScreen';
import RoomScreen from '../screens/RoomScreen';
import RecordScreen from '../screens/RecordScreen';
import { friendApi } from '../api/friendApi';

// Bottom Tab Navigator 인스턴스 생성
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  // Safe Area 여백 (노치, 홈 인디케이터 등)
  const insets = useSafeAreaInsets();

  // 받은 친구 신청 개수 (배지에 표시)
  const [pendingCount, setPendingCount] = useState(0);

  /**
   * 받은 친구 신청 개수 조회
   * 
   * 1. 컴포넌트 마운트 시 최초 1회
   * 2. 30초마다 자동 갱신
   * 3. FriendsScreen에서 수락/거절 시 (콜백)
   */
  const fetchPendingCount = useCallback(async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const pending = await friendApi.getPendingRequests(user.userId);
        setPendingCount(pending.length);
      }
    } catch (error) {
      console.error('Failed to fetch pending count:', error);
    }
  }, []);

  /**
   * 배지 카운트 자동 갱신 설정
   */
  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [fetchPendingCount]);

  // Tab Navigator 렌더링
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        // 탭 색상 설정
        tabBarActiveTintColor: '#1E90FF',
        tabBarInactiveTintColor: 'gray',

        // 탭 바 스타일
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 5,
        },

        // 탭 라벨 스타일
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
        },

        /**
         * 탭 아이콘 렌더링
         */
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'ellipse';

          if (route.name === 'Home') iconName = focused ? 'map' : 'map-outline';
          if (route.name === 'Friends') iconName = focused ? 'people' : 'people-outline';
          if (route.name === 'Room') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          if (route.name === 'Record') iconName = focused ? 'stats-chart' : 'stats-chart-outline';

          // 친구 탭: 배지 표시
          if (route.name === 'Friends' && pendingCount > 0) {
            return (
              <View>
                <Ionicons name={iconName} size={size} color={color} />
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </Text>
                </View>
              </View>
            );
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {/* 탭 화면 정의 */}

      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '홈' }} />

      <Tab.Screen
        name="Friends"
        options={{ tabBarLabel: '친구' }}
      >
        {() => <FriendsScreen onPendingCountChange={fetchPendingCount} />}
      </Tab.Screen>

      <Tab.Screen name="Room" component={RoomScreen} options={{ tabBarLabel: '방' }} />

      <Tab.Screen name="Record" component={RecordScreen} options={{ tabBarLabel: '기록' }} />
    </Tab.Navigator>
  );
};

// 스타일 정의
const styles = StyleSheet.create({
  /**
   * 배지 컨테이너
   */
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  /**
   * 배지 텍스트
   */
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default TabNavigator;

export default TabNavigator;
