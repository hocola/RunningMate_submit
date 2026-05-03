import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  ScrollView,
  BackHandler,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polyline, PROVIDER_GOOGLE, Marker, Region } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { usePermissions } from '../hooks/usePermissions';
import { useLocation } from '../hooks/useLocation';
import { useRunning } from '../hooks/useRunning';
import { useRoomLocation } from '../hooks/useRoomLocation';
import { runningApi } from '../api/runningApi';
import WheelPicker from '../components/picker/WheelPicker';

const { width } = Dimensions.get('window');

// 타입 정의
type RootStackParamList = {
  RoomRunning: { roomId: number };
  Completion: { totalDistance: number; runTime: number; avgSpeed: number; avgPace: number; roomId?: number; recordId?: number };
};

type RoomRunningRouteProp = RouteProp<RootStackParamList, 'RoomRunning'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RoomRunning'>;

const RoomRunningScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoomRunningRouteProp>();
  const roomId = route.params?.roomId ?? 0;

  const [userId, setUserId] = useState<number>(0);
  const [nickname, setNickname] = useState<string>('');
  const [now, setNow] = useState(Date.now());

  // 타이머 갱신
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 유저 정보 불러오기
  useEffect(() => {
    const loadUser = async () => {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserId(user.userId);
        setNickname(user.nickname || `User ${user.userId}`);
      }
    };
    loadUser();
  }, []);

  // 목표 설정 데이터
  const [showGoalModal, setShowGoalModal] = useState(true);
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

  // 러닝 상태 관리 훅
  const { status: permissionStatus } = usePermissions();
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

  const {
    teammates,
    isConnected,
    connect,
    disconnect,
  } = useRoomLocation({
    roomId,
    userId,
    nickname,
    isRunning,
    isPaused,
    currentLocation,
    totalDistance,
    runTime,
    currentSpeed: realtimeSpeed,
    currentPace: realtimePace,
  });

  const mapRef = useRef<MapView>(null);

  const mapRegion = useMemo(() => {
    if (currentLocation) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
    }
    return initialRegion;
  }, [currentLocation, initialRegion]);

  const [selectedTeammateId, setSelectedTeammateId] = useState<number | null>(null);

  const selectedTeammate = useMemo(() => {
    if (selectedTeammateId === null) return null;
    return teammates.find(t => t.userId === selectedTeammateId) || null;
  }, [selectedTeammateId, teammates]);

  // 소켓 연결 및 해제
  useEffect(() => {
    if (userId > 0) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [userId]);

  // 러닝 시작
  const handleStartRunning = () => {
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

  // 목표 달성 확인 및 데이터 저장
  useEffect(() => {
    if (!isRunning || isPaused || finalTarget <= 0) return;

    let goalReached = false;
    if (goalType === 'distance' && totalDistance >= finalTarget) {
      goalReached = true;
    } else if (goalType === 'time' && runTime >= finalTarget) {
      goalReached = true;
    }

    if (goalReached) {
      stopRun();
      disconnect();

      const avgSpeedFinal = runTime > 0 ? (totalDistance / (runTime / 3600)) : 0;
      const avgPaceFinal = totalDistance > 0 ? (runTime / totalDistance) : 0;

      const toLocalISOString = (date: Date): string => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      };

      const saveAndNavigate = async () => {
        let savedRecordId: number | undefined;
        try {
          const endedAt = new Date();
          const routeCoordsData = routeCoordinates.map(coord => ({
            latitude: coord.latitude,
            longitude: coord.longitude,
          }));

          const savedRecord = await runningApi.saveRecordWithRoute({
            userId,
            roomId,
            totalDistanceM: Math.round(totalDistance * 1000),
            durationSeconds: runTime,
            avgPaceSeconds: Math.round(avgPaceFinal),
            avgSpeedKmh: Math.round(avgSpeedFinal * 10) / 10,
            startedAt: startedAt ? toLocalISOString(startedAt) : toLocalISOString(endedAt),
            endedAt: toLocalISOString(endedAt),
            route: routeCoordsData,
          });
          savedRecordId = savedRecord?.recordId;
        } catch (error) {
          console.error('Failed to save record:', error);
        }

        navigation.replace('Completion', {
          totalDistance,
          runTime,
          avgSpeed: avgSpeedFinal,
          avgPace: avgPaceFinal,
          roomId,
          recordId: savedRecordId,
        });
      };

      saveAndNavigate();
    }
  }, [isRunning, isPaused, goalType, totalDistance, runTime, finalTarget]);

  // 수동 종료
  const handleStop = () => {
    Alert.alert(
      '러닝 종료',
      '러닝을 종료하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '종료',
          style: 'destructive',
          onPress: async () => {
            stopRun();
            disconnect();

            if (runTime > 0 && totalDistance > 0) {
              const avgSpeedFinal = totalDistance / (runTime / 3600);
              const avgPaceFinal = runTime / totalDistance;

              const toLocalISOString = (date: Date): string => {
                const pad = (n: number) => n.toString().padStart(2, '0');
                return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
              };

              try {
                const endedAt = new Date();
                const routeCoordsData = routeCoordinates.map(coord => ({
                  latitude: coord.latitude,
                  longitude: coord.longitude,
                }));

                const savedRecord = await runningApi.saveRecordWithRoute({
                  userId,
                  roomId,
                  totalDistanceM: Math.round(totalDistance * 1000),
                  durationSeconds: runTime,
                  avgPaceSeconds: Math.round(avgPaceFinal),
                  avgSpeedKmh: Math.round(avgSpeedFinal * 10) / 10,
                  startedAt: startedAt ? toLocalISOString(startedAt) : toLocalISOString(endedAt),
                  endedAt: toLocalISOString(endedAt),
                  route: routeCoordsData,
                });

                navigation.replace('Completion', {
                  totalDistance,
                  runTime,
                  avgSpeed: avgSpeedFinal,
                  avgPace: avgPaceFinal,
                  roomId,
                  recordId: savedRecord?.recordId,
                });
              } catch (error) {
                console.error('Failed to save record:', error);
                navigation.goBack();
              }
            } else {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    const backAction = () => {
      if (showGoalModal) {
        navigation.goBack();
        return true;
      }
      if (isRunning) {
        handleStop();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showGoalModal, isRunning, runTime, totalDistance]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (num: number) => (num < 10 ? '0' + num : num);
    if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const formatPace = (paceInSeconds: number) => {
    if (paceInSeconds <= 0 || !Number.isFinite(paceInSeconds)) return "-'--\"";
    const minutes = Math.floor(paceInSeconds / 60);
    const seconds = Math.floor(paceInSeconds % 60);
    return `${minutes}'${seconds < 10 ? '0' : ''}${seconds}"`;
  };

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getTeammateDisplayDuration = (teammate: any): number => {
    if (teammate.isPaused) {
      return teammate.duration;
    } else {
      const passedAfterUpdate = Math.floor(
        (now - teammate.lastUpdated.getTime()) / 1000
      );
      return teammate.duration + Math.max(0, passedAfterUpdate);
    }
  };

  const renderTeammateOverlay = () => {
    if (!selectedTeammate) return null;
    const teammateRegion: Region = {
      latitude: selectedTeammate.latitude,
      longitude: selectedTeammate.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };

    return (
      <Modal visible={true} transparent={true} animationType="fade" onRequestClose={() => setSelectedTeammateId(null)}>
        <View style={styles.overlayContainer}>
          <TouchableOpacity style={styles.overlayBackdrop} activeOpacity={1} onPress={() => setSelectedTeammateId(null)} />
          <View style={styles.overlayContent}>
            <View style={styles.overlayHeader}>
              <View style={styles.overlayAvatar}>
                <Ionicons name="person" size={24} color="#fff" />
              </View>
              <Text style={styles.overlayNickname}>{selectedTeammate.nickname}</Text>
              <TouchableOpacity style={styles.overlayCloseBtn} onPress={() => setSelectedTeammateId(null)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.overlayMapContainer}>
              <MapView provider={PROVIDER_GOOGLE} style={styles.overlayMap} region={teammateRegion} scrollEnabled={false} zoomEnabled={false}>
                <Marker coordinate={{ latitude: selectedTeammate.latitude, longitude: selectedTeammate.longitude }}>
                  <View style={styles.teammateMarker}>
                    <Ionicons name="person" size={16} color="#fff" />
                  </View>
                </Marker>
              </MapView>
            </View>
            <View style={styles.overlayStats}>
              <View style={styles.overlayStatItem}>
                <Text style={styles.overlayStatValue}>{selectedTeammate.distance.toFixed(2)}</Text>
                <Text style={styles.overlayStatLabel}>거리 (km)</Text>
              </View>
              <View style={styles.overlayStatDivider} />
              <View style={styles.overlayStatItem}>
                <Text style={styles.overlayStatValue}>{formatDuration(getTeammateDisplayDuration(selectedTeammate))}{selectedTeammate.isPaused ? ' ⏸' : ''}</Text>
                <Text style={styles.overlayStatLabel}>시간</Text>
              </View>
            </View>
            <View style={styles.overlayStats}>
              <View style={styles.overlayStatItem}>
                <Text style={styles.overlayStatValue}>{selectedTeammate.speed.toFixed(1)}</Text>
                <Text style={styles.overlayStatLabel}>속도 (km/h)</Text>
              </View>
              <View style={styles.overlayStatDivider} />
              <View style={styles.overlayStatItem}>
                <Text style={styles.overlayStatValue}>{formatPace(selectedTeammate.pace)}</Text>
                <Text style={styles.overlayStatLabel}>페이스</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const getGoalInfo = () => {
    if (goalType === 'distance') {
      const remaining = Math.max(0, finalTarget - totalDistance);
      return { label: '남은 거리', value: `${remaining.toFixed(2)} km` };
    } else {
      const remaining = Math.max(0, finalTarget - runTime);
      return { label: '남은 시간', value: formatTime(remaining) };
    }
  };

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} provider={PROVIDER_GOOGLE} style={styles.map} region={mapRegion || undefined} showsUserLocation={false} showsMyLocationButton={false}>
        {currentLocation && (
          <Marker coordinate={currentLocation} anchor={{ x: 0.5, y: 0.5 }} rotation={heading} flat>
            <View style={styles.myMarker}><View style={styles.myMarkerInner} /></View>
          </Marker>
        )}
        <Polyline coordinates={routeCoordinates} strokeColor="#1E90FF" strokeWidth={5} />
        {teammates.map((teammate) => (
          <Marker key={teammate.userId} coordinate={{ latitude: teammate.latitude, longitude: teammate.longitude }} onPress={() => setSelectedTeammateId(teammate.userId)}>
            <View style={styles.teammateMarkerSmall}>
              <Text style={styles.teammateMarkerText}>{teammate.nickname.charAt(0).toUpperCase()}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {showGoalModal && (
        <View style={styles.goalModalOverlay}>
          <View style={styles.goalModal}>
            <Text style={styles.goalModalTitle}>목표 설정</Text>
            <View style={styles.goalTabs}>
              <TouchableOpacity style={[styles.goalTab, goalType === 'distance' && styles.goalTabActive]} onPress={() => setGoalType('distance')}>
                <Ionicons name="location-outline" size={18} color={goalType === 'distance' ? '#1E90FF' : '#888'} />
                <Text style={[styles.goalTabText, goalType === 'distance' && styles.goalTabTextActive]}>거리</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.goalTab, goalType === 'time' && styles.goalTabActive]} onPress={() => setGoalType('time')}>
                <Ionicons name="time-outline" size={18} color={goalType === 'time' ? '#1E90FF' : '#888'} />
                <Text style={[styles.goalTabText, goalType === 'time' && styles.goalTabTextActive]}>시간</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.wheelContainer}>
              {goalType === 'distance' ? (
                <><WheelPicker items={numbers0to99} initValue={distInt} onValueChange={setDistInt} /><Text style={styles.wheelDot}>.</Text><WheelPicker items={numbers0to99} initValue={distDec} onValueChange={setDistDec} /><Text style={styles.wheelUnit}>km</Text></>
              ) : (
                <><WheelPicker items={numbers0to99} initValue={timeHour} onValueChange={setTimeHour} /><Text style={styles.wheelDot}>:</Text><WheelPicker items={numbers0to59} initValue={timeMin} onValueChange={setTimeMin} /><Text style={styles.wheelDot}>:</Text><WheelPicker items={numbers0to59} initValue={timeSec} onValueChange={setTimeSec} /></>
              )}
            </View>
            <View style={styles.goalModalButtons}>
              <TouchableOpacity style={styles.goalCancelBtn} onPress={() => navigation.goBack()}><Text style={styles.goalCancelBtnText}>취소</Text></TouchableOpacity>
              <TouchableOpacity style={styles.goalStartBtn} onPress={handleStartRunning}><Ionicons name="play" size={20} color="#fff" /><Text style={styles.goalStartBtnText}>시작</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {!showGoalModal && (
        <>
          <SafeAreaView style={styles.topBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teammateList}>
              {teammates.map((teammate) => (
                <TouchableOpacity key={teammate.userId} style={styles.teammateChip} onPress={() => setSelectedTeammateId(teammate.userId)}>
                  <View style={styles.teammateChipAvatar}><Text style={styles.teammateChipAvatarText}>{teammate.nickname.charAt(0).toUpperCase()}</Text></View>
                  <View style={styles.teammateChipInfo}>
                    <Text style={styles.teammateChipName} numberOfLines={1}>{teammate.nickname}</Text>
                    <Text style={styles.teammateChipStats}>{teammate.distance.toFixed(1)}km · {formatDuration(getTeammateDisplayDuration(teammate))}{teammate.isPaused ? ' ⏸' : ''}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {teammates.length === 0 && <View style={styles.noTeammates}><Text style={styles.noTeammatesText}>{isConnected ? '팀원을 기다리는 중..' : '연결 중..'}</Text></View>}
            </ScrollView>
            <View style={[styles.connectionDot, isConnected ? styles.connected : styles.disconnected]} />
          </SafeAreaView>

          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={styles.statBox}><Text style={styles.statLabel}>거리</Text><Text style={styles.statValue}>{totalDistance.toFixed(2)} km</Text></View>
              <View style={styles.statBox}><Text style={styles.statLabel}>시간</Text><Text style={styles.statValue}>{formatTime(runTime)}</Text></View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBox}><Text style={styles.statLabel}>페이스</Text><Text style={styles.statValue}>{formatPace(realtimePace)}</Text></View>
              <View style={styles.statBox}><Text style={styles.statLabel}>속도</Text><Text style={styles.statValue}>{realtimeSpeed.toFixed(1)} km/h</Text></View>
            </View>
          </View>

          <View style={styles.goalBar}><Text style={styles.goalBarLabel}>{getGoalInfo().label}</Text><Text style={styles.goalBarValue}>{getGoalInfo().value}</Text></View>

          <View style={styles.buttonContainer}>
            {!isPaused ? (
              <TouchableOpacity style={styles.pauseButton} onPress={pauseRun}><Ionicons name="pause" size={24} color="#333" /><Text style={styles.buttonText}>일시정지</Text></TouchableOpacity>
            ) : (
              <View style={styles.pausedButtonsRow}>
                <TouchableOpacity style={styles.stopButton} onPress={handleStop}><Ionicons name="square" size={20} color="#fff" /><Text style={styles.stopButtonText}>종료</Text></TouchableOpacity>
                <TouchableOpacity style={styles.resumeButton} onPress={resumeRun}><Ionicons name="play" size={20} color="#fff" /><Text style={styles.resumeButtonText}>계속</Text></TouchableOpacity>
              </View>
            )}
          </View>
        </>
      )}
      {renderTeammateOverlay()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  myMarker: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#1E90FF', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  myMarkerInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  teammateMarkerSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  teammateMarkerText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 50, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  teammateList: { flexDirection: 'row', gap: 8, paddingRight: 40 },
  teammateChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 24, paddingVertical: 8, paddingHorizontal: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  teammateChipAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  teammateChipAvatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  teammateChipInfo: { maxWidth: 100 },
  teammateChipName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  teammateChipStats: { fontSize: 12, color: '#666', marginTop: 2 },
  noTeammates: { backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16 },
  noTeammatesText: { fontSize: 14, color: '#888' },
  connectionDot: { position: 'absolute', right: 16, top: 60, width: 10, height: 10, borderRadius: 5 },
  connected: { backgroundColor: '#4CAF50' },
  disconnected: { backgroundColor: '#F44336' },
  statsContainer: { position: 'absolute', bottom: '20%', left: 12, right: 12 },
  statsRow: { flexDirection: 'row', marginBottom: 5, gap: 5 },
  statBox: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  statLabel: { fontSize: 10, color: '#888', marginBottom: 1 },
  statValue: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  goalBar: { position: 'absolute', bottom: '15%', left: 12, right: 12, backgroundColor: '#1E90FF', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalBarLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  goalBarValue: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  buttonContainer: { paddingBottom: '10%', position: 'absolute', bottom: 25, left: 16, right: 16 },
  pauseButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingVertical: 12, borderRadius: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3, gap: 6 },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#333' },
  pausedButtonsRow: { flexDirection: 'row', gap: 10 },
  stopButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C2C2E', paddingVertical: 12, borderRadius: 12, gap: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  stopButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  resumeButton: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingVertical: 12, borderRadius: 12, gap: 5, borderWidth: 1.5, borderColor: '#1E90FF' },
  resumeButtonText: { fontSize: 14, fontWeight: '600', color: '#1E90FF' },
  goalModalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  goalModal: { width: '100%', backgroundColor: '#fff', borderRadius: 24, paddingVertical: 28, paddingHorizontal: 24 },
  goalModalTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 24 },
  goalTabs: { flexDirection: 'row', backgroundColor: '#f5f5f5', borderRadius: 12, padding: 4, marginBottom: 24 },
  goalTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6 },
  goalTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  goalTabText: { fontSize: 15, fontWeight: '500', color: '#888' },
  goalTabTextActive: { color: '#1E90FF', fontWeight: '600' },
  wheelContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28, height: 150 },
  wheelDot: { fontSize: 28, fontWeight: '300', color: '#1a1a1a', marginHorizontal: 4 },
  wheelUnit: { fontSize: 20, fontWeight: '500', color: '#666', marginLeft: 8 },
  goalModalButtons: { flexDirection: 'row', gap: 12 },
  goalCancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: '#f5f5f5', alignItems: 'center' },
  goalCancelBtnText: { fontSize: 16, fontWeight: '600', color: '#666' },
  goalStartBtn: { flex: 2, flexDirection: 'row', paddingVertical: 16, borderRadius: 14, backgroundColor: '#1E90FF', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#1E90FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  goalStartBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  overlayContainer: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 100 },
  overlayBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  overlayContent: { width: width * 0.85, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
  overlayHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  overlayAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' },
  overlayNickname: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginLeft: 10 },
  overlayCloseBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  overlayMapContainer: { height: 200 },
  overlayMap: { flex: 1 },
  teammateMarker: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  overlayStats: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, alignItems: 'center' },
  overlayStatItem: { flex: 1, alignItems: 'center' },
  overlayStatValue: { fontSize: 13, fontWeight: 'bold', color: '#1a1a1a' },
  overlayStatLabel: { fontSize: 9, color: '#888', marginTop: 1 },
  overlayStatDivider: { width: 1, height: 20, backgroundColor: '#eee' },
});

export default RoomRunningScreen;
