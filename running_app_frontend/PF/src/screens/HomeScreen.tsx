// src/screens/HomeScreen.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  BackHandler,
} from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hooks & Components
import { usePermissions } from '../hooks/usePermissions';
import { useLocation } from '../hooks/useLocation';
import { useRunning } from '../hooks/useRunning';
import { RankingBox } from '../components/ranking/RankingBox';
import WheelPicker from '../components/picker/WheelPicker';
import RunningScreen from './RunningScreen';
import { styles } from '../App.style';
import { runningApi } from '../api/runningApi';

// 네비게이션 타입 정의
type RootStackParamList = {
  Completion: {
    totalDistance: number;
    runTime: number;
    avgSpeed: number;
    avgPace: number;
    recordId?: number;
  };
  Settings: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  // 1. Hooks
  const navigation = useNavigation<NavigationProp>();
  const { status: permissionStatus, requestPermissions } = usePermissions();
  const {
    isRunning,
    isPaused,
    runTime,
    startedAt,
    startRun,
    pauseRun,
    resumeRun,
    stopRun,
  } = useRunning();

  const {
    currentLocation,
    routeCoordinates,
    heading,
    initialRegion,
    totalDistance,
    clearRoute,
    realtimeSpeed,
    realtimePace,
  } = useLocation({
    permissionStatus,
    isRunning,
    isPaused,
  });

  const mapRef = useRef<MapView>(null);

  // 평균 속도 계산 (km/h): 거리(km) / 시간(h) - 서버 저장용
  const avgSpeed = useMemo(() => {
    if (runTime <= 0 || totalDistance <= 0) return 0;
    const hours = runTime / 3600;
    return totalDistance / hours;
  }, [runTime, totalDistance]);

  // 평균 페이스 계산 (초/km): 시간(초) / 거리(km) - 서버 저장용
  const avgPace = useMemo(() => {
    if (totalDistance <= 0) return 0;
    return runTime / totalDistance;
  }, [runTime, totalDistance]);

  // 2. 목표 설정 상태
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalType, setGoalType] = useState<'distance' | 'time'>('distance');

  const [distInt, setDistInt] = useState('5');
  const [distDec, setDistDec] = useState('00');
  const [timeHour, setTimeHour] = useState('00');
  const [timeMin, setTimeMin] = useState('30');
  const [timeSec, setTimeSec] = useState('00');

  const [finalTarget, setFinalTarget] = useState(0);

  const numbers0to99 = Array.from({ length: 100 }, (_, i) => i.toString());
  const numbers0to59 = Array.from({ length: 60 }, (_, i) =>
    i < 10 ? `0${i}` : i.toString()
  );

  // 3. 버튼 핸들러
  const handlePrepareStart = () => {
    setShowGoalModal(true);
  };

  const handleRealStart = () => {
    let target = 0;

    if (goalType === 'distance') {
      target = Number.parseFloat(`${distInt}.${distDec}`);
    } else {
      target =
        Number.parseInt(timeHour, 10) * 3600 +
        Number.parseInt(timeMin, 10) * 60 +
        Number.parseInt(timeSec, 10);
    }

    setFinalTarget(target);
    setShowGoalModal(false);

    clearRoute();
    startRun();
  };

  // 뒤로가기 (모달 닫기)
  useEffect(() => {
    const backAction = () => {
      if (showGoalModal) {
        setShowGoalModal(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );
    return () => backHandler.remove();
  }, [showGoalModal]);

  // 목표 달성 감지
  useEffect(() => {
    if (!isRunning || isPaused || finalTarget <= 0) return;

    let goalReached = false;

    if (goalType === 'distance' && totalDistance >= finalTarget) {
      goalReached = true;
    } else if (goalType === 'time' && runTime >= finalTarget) {
      goalReached = true;
    }

    if (goalReached) {
      // 러닝 종료
      stopRun();

      // 평균 속도/페이스 계산 (서버 저장 및 완료 화면용)
      const avgSpeedFinal = runTime > 0 ? (totalDistance / (runTime / 3600)) : 0;
      const avgPaceFinal = totalDistance > 0 ? (runTime / totalDistance) : 0;

      // DB 저장
      // 로컬 시간을 ISO 형식 문자열로 변환 (UTC 변환 없이)
      const toLocalISOString = (date: Date): string => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      };

      const saveAndNavigate = async () => {
        let savedRecordId: number | undefined;
        try {
          const userStr = await AsyncStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            const endedAt = new Date();

            // 경로 좌표 변환
            const route = routeCoordinates.map(coord => ({
              latitude: coord.latitude,
              longitude: coord.longitude,
            }));

            const savedRecord = await runningApi.saveRecordWithRoute({
              userId: user.userId,
              totalDistanceM: Math.round(totalDistance * 1000), // km -> m
              durationSeconds: runTime,
              avgPaceSeconds: Math.round(avgPaceFinal),
              avgSpeedKmh: Math.round(avgSpeedFinal * 10) / 10, // 소수점 1자리
              startedAt: startedAt ? toLocalISOString(startedAt) : toLocalISOString(endedAt),
              endedAt: toLocalISOString(endedAt),
              route: route, // 경로 좌표 추가
            });
            savedRecordId = savedRecord?.recordId;
          }
        } catch (error) {
          console.error('Failed to save running record:', error);
        }

        // 완료 화면으로 이동
        navigation.navigate('Completion', {
          totalDistance,
          runTime,
          avgSpeed: avgSpeedFinal,
          avgPace: avgPaceFinal,
          recordId: savedRecordId,
        });
      };

      saveAndNavigate();
    }
  }, [isRunning, isPaused, goalType, totalDistance, runTime, finalTarget]);

  // 4. 로딩 / 권한 처리
  if (
    permissionStatus === 'loading' ||
    (!currentLocation && permissionStatus === 'granted')
  ) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <View style={styles.centerContainer}>
        <Text>위치 권한이 필요합니다.</Text>
        <TouchableOpacity
          onPress={requestPermissions}
          style={styles.startButton}
        >
          <Text style={styles.startButtonText}>권한 요청</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        {/* 지도 */}
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.background}
          region={initialRegion || undefined}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {currentLocation && (
            <Marker
              coordinate={currentLocation}
              anchor={{ x: 0.5, y: 0.5 }}
              rotation={heading}
              flat
            >
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <View style={styles.markerArrow} />
                <View style={styles.markerDot} />
              </View>
            </Marker>
          )}
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#1E09FF"
            strokeWidth={5}
          />
        </MapView>

        {/* UI 오버레이 */}
        <SafeAreaView style={styles.overlay} pointerEvents="box-none">
          {isRunning ? (
            <RunningScreen
              runTime={runTime}
              isPaused={isPaused}
              goalType={goalType}
              targetValue={finalTarget}
              totalDistance={totalDistance}
              currentSpeed={realtimeSpeed}
              currentPace={realtimePace}
              onPause={pauseRun}
              onResume={resumeRun}
              onStop={stopRun}
            />
          ) : (
            <>
              {showGoalModal ? (
                /* 목표 설정 모달 */
                <View style={styles.goalModal}>
                  <View style={styles.tabRowPlain}>
                    <TouchableOpacity
                      style={styles.tabButtonPlain}
                      onPress={() => setGoalType('distance')}
                    >
                      <Text
                        style={[
                          styles.tabTextPlain,
                          goalType === 'distance' &&
                            styles.activeTabTextPlain,
                        ]}
                      >
                        거리 목표
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                     style={styles.tabButtonPlain}
                     onPress={() => setGoalType('time')}
                    >
                      <Text
                        style={[
                          styles.tabTextPlain,
                          goalType === 'time' &&
                            styles.activeTabTextPlain,
                        ]}
                      >
                        시간 목표
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.wheelContainer}>
                    {goalType === 'distance' ? (
                      <>
                        <WheelPicker
                          items={numbers0to99}
                          initValue={distInt}
                          onValueChange={setDistInt}
                        />
                        <Text style={styles.wheelDot}>.</Text>
                        <WheelPicker
                          items={numbers0to99}
                          initValue={distDec}
                          onValueChange={setDistDec}
                        />
                        <Text style={styles.wheelUnit}>km</Text>
                      </>
                    ) : (
                      <>
                        <WheelPicker
                          items={numbers0to99}
                          initValue={timeHour}
                          onValueChange={setTimeHour}
                        />
                        <Text style={styles.wheelDot}>:</Text>
                        <WheelPicker
                          items={numbers0to59}
                          initValue={timeMin}
                          onValueChange={setTimeMin}
                        />
                        <Text style={styles.wheelDot}>:</Text>
                        <WheelPicker
                          items={numbers0to59}
                          initValue={timeSec}
                          onValueChange={setTimeSec}
                        />
                      </>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.samsungStartBtn}
                    onPress={handleRealStart}
                  >
                    <Text style={styles.samsungStartBtnText}>시작</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* 대기 화면 */
                <>
                  <RankingBox />

                  <Text style={styles.motivationText}>
                    5km = 치맥
                  </Text>


                  <TouchableOpacity
                    style={styles.myLocationButton}
                    onPress={() =>
                      currentLocation &&
                      mapRef.current?.animateToRegion({
                        latitude: currentLocation.latitude,
                        longitude: currentLocation.longitude,
                        latitudeDelta: 0.003,
                        longitudeDelta: 0.003,
                      })
                    }
                  >
                    <Ionicons name="locate" size={26} color="#000" />
                  </TouchableOpacity>

                  

                  

                  <View style={styles.bottomPanel}>
                      {/* ✅ 알림 / 설정 아이콘 복구 */}
                    <View style={styles.iconRow}>
                      <TouchableOpacity style={styles.iconButton}>
                        <Ionicons
                          name="notifications"
                          size={30}
                          color="#1a1a1a"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => navigation.navigate('Settings')}
                      >
                        <Ionicons
                          name="settings"
                          size={30}
                          color="#1a1a1a"
                        />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.startButton}
                      onPress={handlePrepareStart}
                    >
                      <Text style={styles.startButtonText}>시작</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          )}
        </SafeAreaView>
      </View>
    </View>
  );
};

export default HomeScreen;
