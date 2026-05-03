import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
type RootStackParamList = {
  RecordDetail: { recordId: number };
};
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { runningApi, RunningRecordResponse } from '../api/runningApi';

type TabType = '주간' | '월간' | '연간' | '전체';

// 날짜 처리 함수
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
  return new Date(d.setDate(diff));
};

const formatDate = (date: Date): string => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}월 ${day}일`;
};

const formatDateForApi = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const RecordScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = useState<TabType>('주간');
  const [records, setRecords] = useState<RunningRecordResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  // 기간 데이터 상태
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));

  // 유저 정보 로드
  useEffect(() => {
    const loadUser = async () => {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserId(user.userId);
      }
    };
    loadUser();
  }, []);

  // 기록 데이터 로드
  const fetchRecords = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      let data: RunningRecordResponse[] = [];

      switch (activeTab) {
        case '주간':
          data = await runningApi.getWeeklyRecords(userId, formatDateForApi(weekStart));
          break;
        case '월간':
          data = await runningApi.getMonthlyRecords(
            userId,
            currentDate.getFullYear(),
            currentDate.getMonth() + 1
          );
          break;
        case '연간':
          data = await runningApi.getYearlyRecords(userId, currentDate.getFullYear());
          break;
        case '전체':
          data = await runningApi.getUserRecords(userId);
          break;
      }

      setRecords(data);
    } catch (error) {
      console.error('Failed to fetch records:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [userId, activeTab, weekStart, currentDate]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // 기간 이동 처리
  const movePeriod = (direction: 'prev' | 'next') => {
    if (activeTab === '주간') {
      const newStart = new Date(weekStart);
      newStart.setDate(newStart.getDate() + (direction === 'prev' ? -7 : 7));
      setWeekStart(newStart);
    } else if (activeTab === '월간') {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
      setCurrentDate(newDate);
    } else if (activeTab === '연간') {
      const newDate = new Date(currentDate);
      newDate.setFullYear(newDate.getFullYear() + (direction === 'prev' ? -1 : 1));
      setCurrentDate(newDate);
    }
  };

  // 조회 기간 텍스트
  const getPeriodText = (): string => {
    if (activeTab === '주간') {
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 6);
      return `${formatDate(weekStart)} ~ ${formatDate(end)}`;
    } else if (activeTab === '월간') {
      return `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;
    } else if (activeTab === '연간') {
      return `${currentDate.getFullYear()}년`;
    }
    return '';
  };

  // 시간 형식 변환
  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}시간 ${m}분`;
    return `${m}분 ${s}초`;
  };

  // 페이스 형식 변환
  const formatPace = (seconds?: number): string => {
    if (!seconds) return "-'--\"";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}'${s.toString().padStart(2, '0')}"`;
  };

  // 기록 리스트 날짜 형식
  const formatRecordDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = minute = date.getMinutes();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    return `${month}월 ${day}일 (${weekday}) ${hour}:${minute.toString().padStart(2, '0')}`;
  };

  // 기록 아이템 렌더링
  const renderRecordItem = ({ item }: { item: RunningRecordResponse }) => (
    <TouchableOpacity
      style={styles.recordItem}
      onPress={() => navigation.navigate('RecordDetail', { recordId: item.recordId })}
    >
      <View style={styles.recordHeader}>
        <Text style={styles.recordDate}>{formatRecordDate(item.startedAt)}</Text>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </View>

      <View style={styles.recordStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{(item.totalDistanceM / 1000).toFixed(2)}</Text>
          <Text style={styles.statLabel}>km</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDuration(item.durationSeconds)}</Text>
          <Text style={styles.statLabel}>시간</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatPace(item.avgPaceSeconds)}</Text>
          <Text style={styles.statLabel}>페이스</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 탭 */}
      <View style={styles.tabContainer}>
        {(['주간', '월간', '연간', '전체'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 기간 선택 영역 (전체 탭 제외) */}
      {activeTab !== '전체' && (
        <View style={styles.periodSelector}>
          <TouchableOpacity onPress={() => movePeriod('prev')} style={styles.arrowBtn}>
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>

          <Text style={styles.periodText}>{getPeriodText()}</Text>

          <TouchableOpacity onPress={() => movePeriod('next')} style={styles.arrowBtn}>
            <Ionicons name="chevron-forward" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      )}

      {/* 기록 리스트 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E90FF" />
        </View>
      ) : records.length > 0 ? (
        <FlatList
          data={records}
          keyExtractor={(item) => item.recordId.toString()}
          renderItem={renderRecordItem}
          contentContainerStyle={[styles.listContent, { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="stats-chart-outline" size={60} color="#ddd" />
          <Text style={styles.emptyText}>기록이 없습니다</Text>
          <Text style={styles.emptySubtext}>러닝을 시작해보세요!</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: '10%',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#1E90FF',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  arrowBtn: {
    padding: 8,
  },
  periodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginHorizontal: 20,
    minWidth: 180,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  recordItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  recordStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#eee',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
});

export default RecordScreen;
