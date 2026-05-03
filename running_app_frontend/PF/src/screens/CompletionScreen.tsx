import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

type CompletionParams = {
  totalDistance: number;  // km
  runTime: number;        // 초
  avgSpeed: number;       // km/h
  avgPace: number;        // 초/km
  roomId?: number;        // 방 ID (있으면 방 러닝)
  recordId?: number;
};

type CompletionRouteProp = RouteProp<{ Completion: CompletionParams }, 'Completion'>;

const CompletionScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<CompletionRouteProp>();
  const { totalDistance, runTime, avgSpeed, avgPace, roomId, recordId } = route.params;

  const [countdown, setCountdown] = useState(20);

  // 컴포넌트 재생성 방지를 위해 useCallback 사용
  const goBack = useCallback(() => {
    if (roomId) {
      // 방 러닝 종료 시 방 대기화면으로 이동
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Main' },
          { name: 'RoomLobby', params: { roomId } },
        ],
      });
      return;
    }
    // 개인 러닝 종료 시 홈으로 이동
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  }, [navigation, roomId]);

  const goToRecordDetail = useCallback(() => {
    if (!recordId) return;
    navigation.navigate('RecordDetail', { recordId });
  }, [navigation, recordId]);

   // 20초 카운트다운 설정
   useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 카운트다운 종료 시 자동 이동
  useEffect(() => {
    if (countdown === 0) {
      goBack();
    }
  }, [countdown, goBack]);

  // 시간 포맷팅
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (num: number) => (num < 10 ? `0${num}` : `${num}`);

    if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    return `${pad(minutes)}:${pad(seconds)}`;
  };

   // 페이스 포맷팅
  const formatPace = (paceInSeconds: number) => {
    if (paceInSeconds <= 0 || !isFinite(paceInSeconds)) return "-'--\"";
    const minutes = Math.floor(paceInSeconds / 60);
    const seconds = Math.floor(paceInSeconds % 60);
    return `${minutes}'${seconds < 10 ? '0' : ''}${seconds}"`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 완료 표시 */}
      <View style={styles.header}>
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={48} color="#fff" />
        </View>
        <Text style={styles.title}>목표 달성</Text>
        <Text style={styles.subtitle}>오늘도 멋진 러닝이었어요</Text>
      </View>
      
      {/* 메인 거리 표시 */}
      <View style={styles.mainStat}>
        <Text style={styles.mainValue}>{totalDistance.toFixed(2)}</Text>
        <Text style={styles.mainUnit}>km</Text>
      </View>

      {/* 상세 통계 */}
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={22} color="#1E90FF" />
          <Text style={styles.statLabel}>시간</Text>
          <Text style={styles.statValue}>{formatTime(runTime)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <Ionicons name="speedometer-outline" size={22} color="#1E90FF" />
          <Text style={styles.statLabel}>속도</Text>
          <Text style={styles.statValue}>{avgSpeed.toFixed(1)} km/h</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <Ionicons name="footsteps-outline" size={22} color="#1E90FF" />
          <Text style={styles.statLabel}>페이스</Text>
          <Text style={styles.statValue}>{formatPace(avgPace)}</Text>
        </View>
      </View>

      {/* 하단 영역 */}
      <View style={styles.bottomArea}>
        <Text style={styles.countdownText}>{countdown}초 후 자동으로 돌아갑니다</Text>

        {recordId ? (
          <TouchableOpacity style={styles.detailButton} onPress={goToRecordDetail}>
            <Text style={styles.detailButtonText}>오늘 기록 상세보기</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.homeButton} onPress={goBack}>
          <Text style={styles.homeButtonText}>{roomId ? '방으로 돌아가기' : '홈으로 돌아가기'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 30,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    marginTop: 6,
  },
  mainStat: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    paddingVertical: 30,
  },
  mainValue: {
    fontSize: 72,
    fontWeight: '200',
    color: '#1a1a1a',
    letterSpacing: -2,
  },
  mainUnit: {
    fontSize: 24,
    fontWeight: '500',
    color: '#888',
    marginLeft: 8,
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  divider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
  bottomArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 50,
    paddingHorizontal: 24,
  },
  countdownText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#aaa',
    marginBottom: 20,
  },
  detailButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#1E90FF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  detailButtonText: {
    color: '#1E90FF',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    backgroundColor: '#1E90FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default CompletionScreen;
