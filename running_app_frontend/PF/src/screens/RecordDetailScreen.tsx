import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { runningApi, RunningRecordResponse, LocationLog } from '../api/runningApi';
import { roomApi, Room } from '../api/roomApi';
import { User } from '../api/friendApi';

type RecordDetailParams = {
  recordId: number;
};

type RecordDetailRouteProp = RouteProp<{ RecordDetail: RecordDetailParams }, 'RecordDetail'>;

type SplitRow = {
  distanceKmLabel: string;
  splitSeconds: number;
  splitPaceSeconds: number;
  heartRate?: number;
};

const EARTH_RADIUS_M = 6371000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

const distanceMeters = (a: LocationLog, b: LocationLog): number => {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

const RecordDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RecordDetailRouteProp>();
  const { recordId } = route.params;

  const [record, setRecord] = useState<RunningRecordResponse | null>(null);
  const [routeCoords, setRouteCoords] = useState<LocationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  const [partners, setPartners] = useState<User[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recordData, routeData] = await Promise.all([
          runningApi.getRecord(recordId),
          runningApi.getRoute(recordId),
        ]);
        setRecord(recordData);
        setRouteCoords(routeData);

        // 함께 뛴 사람 조회
        if (recordData.roomId) {
          try {
            const [roomData, partnersData] = await Promise.all([
              roomApi.getRoom(recordData.roomId),
              runningApi.getRunningPartners(recordId),
            ]);
            setRoom(roomData);
            setPartners(partnersData);
          } catch (e) {
            console.error('Failed to fetch room/partners:', e);
          }
        }
      } catch (error) {
        console.error('Failed to fetch record detail:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [recordId]);

  // 시간 포맷
  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}시간 ${m}분 ${s}초`;
    return `${m}분 ${s}초`;
  };

  // 페이스 포맷
  const formatPace = (seconds?: number): string => {
    if (!seconds || seconds <= 0) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}'${s.toString().padStart(2, '0')}"`;
  };

  // 날짜 포맷
  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const min = date.getMinutes();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    return `${year}년 ${month}월 ${day}일 (${weekday}) ${hour}:${min
      .toString()
      .padStart(2, '0')}`;
  };

  const mapCoords = useMemo(
    () =>
      routeCoords.map((c) => ({
        latitude: c.latitude,
        longitude: c.longitude,
      })),
    [routeCoords]
  );

  const hasMeaningfulDistance = (record?.totalDistanceM ?? 0) >= 10;

  const splitRows = useMemo<SplitRow[]>(() => {
    if (!record || routeCoords.length < 2 || record.totalDistanceM < 1000) return [];

    const coords = [...routeCoords].sort((a, b) => a.seq - b.seq);
    const startSeq = coords[0].seq;
    const endSeq = coords[coords.length - 1].seq;
    const seqSpan = Math.max(endSeq - startSeq, 1);
    const cumulativeMeters: number[] = [0];

    for (let i = 1; i < coords.length; i += 1) {
      const segment = distanceMeters(coords[i - 1], coords[i]);
      cumulativeMeters.push(cumulativeMeters[i - 1] + segment);
    }

    const totalKm = record.totalDistanceM / 1000;
    const fullKmCount = Math.floor(totalKm);
    if (fullKmCount < 1) return [];

    const getElapsedSecondsAtDistance = (targetMeters: number): number => {
      if (targetMeters <= 0) return 0;

      for (let i = 1; i < cumulativeMeters.length; i += 1) {
        const prevDist = cumulativeMeters[i - 1];
        const currDist = cumulativeMeters[i];
        if (currDist < targetMeters) continue;

        const range = Math.max(currDist - prevDist, 0.000001);
        const ratio = (targetMeters - prevDist) / range;
        const prevSeq = coords[i - 1].seq;
        const currSeq = coords[i].seq;
        const interpolatedSeq = prevSeq + (currSeq - prevSeq) * ratio;
        const elapsedRatio = Math.max(0, Math.min(1, (interpolatedSeq - startSeq) / seqSpan));
        return Math.round(record.durationSeconds * elapsedRatio);
      }

      return record.durationSeconds;
    };

    const rows: SplitRow[] = [];
    let prevElapsed = 0;

    for (let km = 1; km <= fullKmCount; km += 1) {
      const elapsedAtKm = getElapsedSecondsAtDistance(km * 1000);
      const splitSeconds = Math.max(1, elapsedAtKm - prevElapsed);
      prevElapsed = elapsedAtKm;

      rows.push({
        distanceKmLabel: `${km}km`,
        splitSeconds,
        splitPaceSeconds: splitSeconds,
      });
    }

    return rows;
  }, [record, routeCoords]);

  // 지도 영역 계산
  const getMapRegion = () => {
    if (routeCoords.length === 0) {
      return {
        latitude: 37.5665,
        longitude: 126.978,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    const lats = routeCoords.map((c) => c.latitude);
    const lngs = routeCoords.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.5 || 0.01,
      longitudeDelta: (maxLng - minLng) * 1.5 || 0.01,
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E90FF" />
        </View>
      </SafeAreaView>
    );
  }

  if (!record) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>기록을 불러올 수 없습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 영역 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>러닝 기록</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 러닝 일시 */}
        <Text style={styles.dateText}>{formatDateTime(record.startedAt)}</Text>

        {/* 총 달린 거리 */}
        <View style={styles.mainStat}>
          <Text style={styles.mainValue}>{(record.totalDistanceM / 1000).toFixed(2)}</Text>
          <Text style={styles.mainUnit}>km</Text>
        </View>

        {/* 상세 통계 카드 */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <StatItem icon="time-outline" label="시간" value={formatDuration(record.durationSeconds)} />
            <StatItem
              icon="speedometer-outline"
              label="평균 속도"
              value={
                hasMeaningfulDistance && record.avgSpeedKmh
                  ? `${record.avgSpeedKmh.toFixed(1)} km/h`
                  : '--'
              }
            />
          </View>

          <View style={styles.statsRow}>
            <StatItem
              icon="footsteps-outline"
              label="평균 페이스"
              value={hasMeaningfulDistance ? formatPace(record.avgPaceSeconds) : '--'}
            />
            <StatItem
              icon="heart-outline"
              label="평균 심박수"
              value={record.avgHeartRate ? `${record.avgHeartRate} bpm` : '--'}
              isEmpty={!record.avgHeartRate}
            />
          </View>

          <View style={styles.statsRow}>
            <StatItem
              icon="flame-outline"
              label="칼로리"
              value={record.calories ? `${record.calories} kcal` : '--'}
              isEmpty={!record.calories}
            />
            <View style={styles.statItem} />
          </View>
        </View>

        <View style={styles.splitsSection}>
          <Text style={styles.sectionTitle}>구간 기록</Text>
          {splitRows.length > 0 ? (
            <View style={styles.splitsCard}>
              <View style={styles.splitHeaderRow}>
                <Text style={styles.splitHeaderText}>거리</Text>
                <Text style={styles.splitHeaderText}>시간</Text>
                <Text style={styles.splitHeaderText}>심박수</Text>
              </View>
              {splitRows.map((split) => (
                <View key={split.distanceKmLabel} style={styles.splitRow}>
                  <Text style={styles.splitCellText}>{split.distanceKmLabel}</Text>
                  <Text style={styles.splitCellText}>{formatPace(split.splitPaceSeconds)}</Text>
                  <Text style={styles.splitCellText}>{split.heartRate ? String(split.heartRate) : '---'}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.splitsEmptyCard}>
              <Text style={styles.splitsEmptyText}>1km 이상 주행 시 구간 기록이 표시됩니다</Text>
            </View>
          )}
        </View>

        {/* 방 정보 (함께 러닝한 경우) */}
        {room && (
          <View style={styles.roomSection}>
            <Text style={styles.sectionTitle}>러닝 방</Text>
            <View style={styles.roomCard}>
              <View style={styles.roomCardHeader}>
                <Ionicons name="people" size={20} color="#1E90FF" />
                <Text style={styles.roomName}>{room.roomName}</Text>
              </View>
              {room.description && <Text style={styles.roomDescription}>{room.description}</Text>}
            </View>
          </View>
        )}

        {/* 함께 뛴 멤버 목록 */}
        {partners.length > 0 && (
          <View style={styles.partnersSection}>
            <Text style={styles.sectionTitle}>함께 뛴 멤버</Text>
            <View style={styles.partnersContainer}>
              {partners.map((partner, index) => (
                <View key={`${partner.userId}-${index}`} style={styles.partnerChip}>
                  <Ionicons name="person" size={14} color="#1E90FF" />
                  <Text style={styles.partnerName}>{partner.nickname}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 러닝 경로 지도 */}
        <View style={styles.mapSection}>
          <Text style={styles.sectionTitle}>러닝 경로</Text>
          {routeCoords.length > 0 ? (
            <View style={styles.mapContainer}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={getMapRegion()}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Polyline coordinates={mapCoords} strokeColor="#1E90FF" strokeWidth={4} />
                {/* 경로 시작 및 종료 지점 */}
                {mapCoords.length > 0 && (
                  <Marker coordinate={mapCoords[0]}>
                    <View style={styles.startMarker}>
                      <Text style={styles.markerText}>S</Text>
                    </View>
                  </Marker>
                )}
                {mapCoords.length > 1 && (
                  <Marker coordinate={mapCoords[mapCoords.length - 1]}>
                    <View style={styles.endMarker}>
                      <Text style={styles.markerText}>E</Text>
                    </View>
                  </Marker>
                )}
              </MapView>
            </View>
          ) : (
            <View style={styles.noRouteContainer}>
              <Ionicons name="map-outline" size={40} color="#ddd" />
              <Text style={styles.noRouteText}>경로 데이터가 없습니다</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// 통계 아이템 컴포넌트
const StatItem = ({
  icon,
  label,
  value,
  isEmpty,
}: {
  icon: string;
  label: string;
  value: string;
  isEmpty?: boolean;
}) => (
  <View style={styles.statItem}>
    <Ionicons name={icon as any} size={22} color={isEmpty ? '#ddd' : '#1E90FF'} />
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, isEmpty && styles.statValueEmpty]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: '10%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dateText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
  mainStat: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginVertical: 20,
  },
  mainValue: {
    fontSize: 56,
    fontWeight: '200',
    color: '#1a1a1a',
    letterSpacing: -1,
  },
  mainUnit: {
    fontSize: 22,
    fontWeight: '500',
    color: '#888',
    marginLeft: 8,
  },
  statsCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 6,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statValueEmpty: {
    color: '#ccc',
  },
  splitsSection: {
    marginBottom: 24,
  },
  splitsCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  splitHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
    marginBottom: 6,
  },
  splitHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  splitCellText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  splitsEmptyCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  splitsEmptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    fontWeight: '500',
  },
  // 방 정보 섹션
  roomSection: {
    marginBottom: 24,
  },
  roomCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  roomCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  roomDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  
  // 함께 뛴 멤버 섹션
  partnersSection: {
    marginBottom: 24,
  },
  partnersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  partnerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  partnerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E90FF',
  },
  mapSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  noRouteContainer: {
    height: 150,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noRouteText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  startMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  endMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default RecordDetailScreen;
