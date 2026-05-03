import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { roomApi, Room, RoomParticipant } from '../api/roomApi';
import { friendApi, User } from '../api/friendApi';
import { WS_BASE_URL } from '../config';

interface RunningStatus {
  distance: number;
  duration: number;
  speed: number;
  pace: number;
  isPaused: boolean;
  lastUpdated: Date;
}

type RootStackParamList = {
  RoomLobby: { roomId: number };
  RoomRunning: { roomId: number };
  TeamRecord: { roomId: number };
};

type RoomLobbyRouteProp = RouteProp<RootStackParamList, 'RoomLobby'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RoomLobby'>;

interface MemberInfo {
  participant: RoomParticipant;
  user: User;
  isRunning: boolean;
  distance?: number;
  duration?: number;
}

const RoomLobbyScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoomLobbyRouteProp>();
  const { roomId } = route.params;

  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [isHost, setIsHost] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);
  const [runningStatuses, setRunningStatuses] = useState<Map<number, RunningStatus>>(new Map());

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  // 소켓 연결 및 상태 관리
  useEffect(() => {
    if (userId === null) return;
    shouldReconnectRef.current = true;

    const connectWebSocket = () => {
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      const ws = new WebSocket(WS_BASE_URL);
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'join',
          roomId: roomId.toString(),
          userId: userId.toString(),
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'loc') {
            const senderId = parseInt(data.userId);
            if (senderId !== userId) {
              setRunningStatuses(prev => {
                const newMap = new Map(prev);
                newMap.set(senderId, {
                  distance: parseFloat(data.distance) || 0,
                  duration: parseInt(data.duration) || 0,
                  speed: parseFloat(data.speed) || 0,
                  pace: parseFloat(data.pace) || 0,
                  isPaused: data.isPaused === true || data.isPaused === 'true',
                  lastUpdated: new Date(),
                });
                return newMap;
              });
            }
          } else if (data.type === 'left') {
            const leftUserId = parseInt(data.userId);
            setRunningStatuses(prev => {
              const newMap = new Map(prev);
              newMap.delete(leftUserId);
              return newMap;
            });
          }
        } catch (e) {
          console.warn('[LobbyWS] Parse error:', e);
        }
      };

      ws.onclose = () => {
        if (shouldReconnectRef.current) {
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        }
      };

      wsRef.current = ws;
    };

    connectWebSocket();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'leave',
          roomId: roomId.toString(),
          userId: userId.toString(),
        }));
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [userId, roomId]);

  // 오래된 상태 데이터 정리
  useEffect(() => {
    const cleanup = setInterval(() => {
      const nowTime = new Date();
      setRunningStatuses(prev => {
        const newMap = new Map(prev);
        for (const [uid, status] of newMap.entries()) {
          if (nowTime.getTime() - status.lastUpdated.getTime() > 30000) {
            newMap.delete(uid);
          }
        }
        return newMap;
      });
    }, 10000);
    return () => clearInterval(cleanup);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const roomData = await roomApi.getRoom(roomId);
      setRoom(roomData);
      setIsHost(userId === roomData.hostUserId);

      const participants = await roomApi.getParticipants(roomId);
      const memberInfos: MemberInfo[] = await Promise.all(
        participants.map(async (p) => {
          const user = await friendApi.getUser(p.userId);
          return { participant: p, user, isRunning: false };
        })
      );
      setMembers(memberInfos);
    } catch (error) {
      console.error('Failed to load room data:', error);
      Alert.alert('오류', '방 정보를 불러올 수 없습니다');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [roomId, userId, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (userId !== null) loadData();
    }, [userId, loadData])
  );

  const handleStartRunning = () => {
    navigation.navigate('RoomRunning', { roomId });
  };

  const handleViewRecords = () => {
    navigation.navigate('TeamRecord', { roomId });
  };

  const handleLeaveRoom = () => {
    const message = isHost
      ? '방장이 나가면 방이 삭제됩니다. 정말 나가시겠습니까?'
      : '정말 방을 나가시겠습니까?';

    Alert.alert('방 나가기', message, [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: async () => {
          try {
            if (userId) await roomApi.leaveRoom(roomId, userId);
            navigation.goBack();
          } catch (error) {
            console.error('Failed:', error);
            Alert.alert('오류', '방 나가기에 실패했습니다');
          }
        },
      },
    ]);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    return `${mins}분`;
  };

  const getDisplayDuration = (status: RunningStatus): number => {
    if (status.isPaused) return status.duration;
    const passedAfterUpdate = Math.floor((now - status.lastUpdated.getTime()) / 1000);
    return status.duration + Math.max(0, passedAfterUpdate);
  };

  const renderMemberItem = ({ item }: { item: MemberInfo }) => {
    const isMe = item.user.userId === userId;
    const isRoomHost = item.user.userId === room?.hostUserId;
    const runningStatus = runningStatuses.get(item.user.userId);
    const isRunning = !!runningStatus;

    return (
      <View style={styles.memberCard}>
        <View style={styles.memberLeft}>
          <View style={[styles.avatar, isRunning && styles.avatarRunning]}>
            <Ionicons name="person" size={20} color={isRunning ? '#fff' : '#888'} />
          </View>
          <View style={styles.memberInfo}>
            <View style={styles.nicknameRow}>
              <Text style={styles.nickname}>{item.user.nickname}{isMe && ' (나)'}</Text>
              {isRoomHost && (
                <View style={styles.hostBadge}><Text style={styles.hostBadgeText}>방장</Text></View>
              )}
            </View>
          </View>
        </View>
        <View style={styles.memberRight}>
          {isRunning && runningStatus ? (
            <View style={styles.runningStatus}>
              <Text style={styles.runningStats}>
                {runningStatus.distance.toFixed(1)}km · {formatDuration(getDisplayDuration(runningStatus))}
              </Text>
              <View style={styles.runningIndicator}>
                <View style={[styles.runningDot, runningStatus.isPaused && styles.pausedDot]} />
                <Text style={[styles.runningText, runningStatus.isPaused && styles.pausedText]}>
                  {runningStatus.isPaused ? '일시정지' : '러닝중'}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.waitingText}>대기 중</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#1E90FF" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{room?.roomName || '방'}</Text>
        <TouchableOpacity onPress={handleLeaveRoom} style={styles.menuBtn}>
          <Ionicons name="exit-outline" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>

      {room?.description && (
        <View style={styles.descriptionContainer}><Text style={styles.descriptionText}>{room.description}</Text></View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>멤버 ({members.length}/{room?.maxParticipants || 0})</Text>
        <TouchableOpacity onPress={loadData}><Ionicons name="refresh" size={20} color="#888" /></TouchableOpacity>
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.user.userId.toString()}
        renderItem={renderMemberItem}
        contentContainerStyle={styles.memberList}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleViewRecords}>
          <Ionicons name="trophy-outline" size={20} color="#1E90FF" />
          <Text style={styles.secondaryBtnText}>팀 기록 보기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleStartRunning}>
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>러닝 시작</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingTop: '10%' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#1a1a1a', textAlign: 'center', marginHorizontal: 8 },
  menuBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  descriptionContainer: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  descriptionText: { fontSize: 14, color: '#666', lineHeight: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  memberList: { paddingHorizontal: 16, paddingBottom: 100 },
  memberCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  memberLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarRunning: { backgroundColor: '#4CAF50' },
  memberInfo: { flex: 1 },
  nicknameRow: { flexDirection: 'row', alignItems: 'center' },
  nickname: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  hostBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  hostBadgeText: { fontSize: 11, fontWeight: '600', color: '#FF9800' },
  memberRight: { alignItems: 'flex-end' },
  runningStatus: { alignItems: 'flex-end' },
  runningStats: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  runningIndicator: { flexDirection: 'row', alignItems: 'center' },
  runningDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 4 },
  runningText: { fontSize: 12, color: '#4CAF50', fontWeight: '500' },
  pausedDot: { backgroundColor: '#FF9800' },
  pausedText: { color: '#FF9800' },
  waitingText: { fontSize: 14, color: '#999' },
  bottomButtons: { paddingBottom:'15%', position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', gap: 12 },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1E90FF', backgroundColor: '#fff' },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: '#1E90FF', marginLeft: 6 },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#1E90FF' },
  primaryBtnText: { fontSize: 15, fontWeight: '600', color: '#fff', marginLeft: 6 },
});

export default RoomLobbyScreen;
