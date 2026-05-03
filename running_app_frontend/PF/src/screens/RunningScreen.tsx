import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type RunningScreenProps = {
  runTime: number;
  isPaused: boolean;
  goalType: 'distance' | 'time';
  targetValue: number;
  totalDistance: number;   // km 단위 거리
  currentSpeed: number;    // km/h 단위 속도
  currentPace: number;     // 초/km 단위 페이스
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

const RunningScreen = ({
  runTime, isPaused, goalType, targetValue,
  totalDistance, currentSpeed, currentPace,
  onPause, onResume, onStop
}: RunningScreenProps) => {

  // HH:MM:SS 형식 변환
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (num: number) => (num < 10 ? '0' + num : num);
    if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // 페이스 포맷 (분'초")
  const formatPace = (paceInSeconds: number) => {
    if (paceInSeconds <= 0 || !isFinite(paceInSeconds)) return "-'--\"";
    const minutes = Math.floor(paceInSeconds / 60);
    const seconds = Math.floor(paceInSeconds % 60);
    return `${minutes}'${seconds < 10 ? '0' : ''}${seconds}"`;
  };

  // 남은 거리 또는 시간 계산
  const getBottomBarInfo = () => {
    if (goalType === 'distance') {
      const remainingDist = Math.max(0, targetValue - totalDistance);
      return {
        label: '남은 거리',
        value: `${remainingDist.toFixed(2)} km`
      };
    } else {
      const remainingSeconds = Math.max(0, targetValue - runTime);
      return {
        label: '남은 시간',
        value: formatTime(remainingSeconds)
      };
    }
  };

  const bottomInfo = getBottomBarInfo();

  return (
    <>
      <View style={styles.metricsContainer}>
        <View style={styles.row}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>거리</Text>
            <Text style={styles.metricValue}>{totalDistance.toFixed(2)} km</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>시간</Text>
            <Text style={styles.metricValue}>{formatTime(runTime)}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>페이스</Text>
            <Text style={styles.metricValue}>{formatPace(currentPace)}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>속도</Text>
            <Text style={styles.metricValue}>{currentSpeed.toFixed(1)} km/h</Text>
          </View>
        </View>
      </View>

      {/* 목표 대비 남은 정보 표시 */}
      <View style={styles.bottomBar}>
        <Text style={styles.bottomBarLabel}>{bottomInfo.label}</Text>
        <Text style={styles.bottomBarValue}>{bottomInfo.value}</Text>
      </View>

      <View style={styles.buttonContainer}>
        {!isPaused ? (
          <TouchableOpacity style={styles.pauseButton} onPress={onPause}>
            <Text style={styles.buttonText}>일시정지</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.pausedButtonsRow}>
            <TouchableOpacity style={styles.stopButton} onPress={onStop}>
              <Text style={styles.stopButtonText}>종료</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resumeButton} onPress={onResume}>
              <Text style={styles.resumeButtonText}>계속</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  metricsContainer: { position: 'absolute', top: 50, left: 16, right: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  metricBox: { width: '48%', backgroundColor: 'rgba(255, 255, 255, 0.95)', paddingVertical: 14, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  metricLabel: { fontSize: 12, color: '#888', marginBottom: 3 },
  metricValue: { fontSize: 17, fontWeight: '600', color: '#1a1a1a' },
  buttonContainer: { position: 'absolute', bottom: 100, alignSelf: 'center', width: '100%', alignItems: 'center', paddingHorizontal: 16 },
  pauseButton: { backgroundColor: '#ffffff', paddingVertical: 14, paddingHorizontal: 70, borderRadius: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3 },
  pausedButtonsRow: { flexDirection: 'row', justifyContent: 'center', width: '100%', gap: 10 },
  stopButton: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  resumeButton: {
    flex: 1.5,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1E90FF',
  },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#333' },
  stopButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  resumeButtonText: { fontSize: 15, fontWeight: '600', color: '#1E90FF' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: '#1E90FF', justifyContent: 'center', alignItems: 'center', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 8 },
  bottomBarLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  bottomBarValue: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
});

export default RunningScreen;