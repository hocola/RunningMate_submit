import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { roomApi, Room, CreateRoomRequest } from '../api/roomApi';

type RootStackParamList = {
  RoomLobby: { roomId: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabType = '나의 방 목록' | '전체 방 목록';

const RoomScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const [activeTab, setActiveTab] = useState<TabType>('나의 방 목록');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [inputPassword, setInputPassword] = useState('');
  const [joining, setJoining] = useState(false);

  const [participantCounts, setParticipantCounts] = useState<Map<number, number>>(new Map());

  // 사용자 정보 불러오기
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

  // 내 방 목록 가져오기
  const fetchMyRooms = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await roomApi.getMyRooms(userId);
      setMyRooms(data);
      for (const room of data) {
        const count = await roomApi.getParticipantCount(room.roomId);
        setParticipantCounts(prev => new Map(prev).set(room.roomId, count));
      }
    } catch (error) {
      console.error('Failed to fetch my rooms:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 전체 방 목록 가져오기
  const fetchAllRooms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await roomApi.getAllRooms();
      setAllRooms(data);
      for (const room of data) {
        const count = await roomApi.getParticipantCount(room.roomId);
        setParticipantCounts(prev => new Map(prev).set(room.roomId, count));
      }
    } catch (error) {
      console.error('Failed to fetch all rooms:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === '나의 방 목록') {
      fetchMyRooms();
    } else {
      fetchAllRooms();
    }
  }, [activeTab, fetchMyRooms, fetchAllRooms]);

  useFocusEffect(
    useCallback(() => {
      fetchMyRooms();
      if (activeTab === '전체 방 목록') {
        fetchAllRooms();
      }
    }, [activeTab, fetchMyRooms, fetchAllRooms])
  );

  const resetModal = () => {
    setRoomName('');
    setRoomPassword('');
    setMaxParticipants(4);
    setDescription('');
  };

  // 방 생성
  const handleCreateRoom = async () => {
    if (!userId) return;

    if (!roomName.trim()) {
      Alert.alert('알림', '방 이름을 입력해주세요');
      return;
    }

    if (roomPassword && roomPassword.length !== 4) {
      Alert.alert('알림', '비밀번호는 4자리로 입력해주세요');
      return;
    }

    setCreating(true);
    try {
      const request: CreateRoomRequest = {
        hostUserId: userId,
        roomName: roomName.trim(),
        roomPassword: roomPassword || null,
        maxParticipants,
        description: description.trim() || null,
      };

      await roomApi.createRoom(request);
      Alert.alert('성공', '방이 생성되었습니다');
      setModalVisible(false);
      resetModal();
      setActiveTab('나의 방 목록');
      fetchMyRooms();
    } catch (error) {
      console.error('failed:', error);
      Alert.alert('오류', '방 생성에 실패했습니다');
    } finally {
      setCreating(false);
    }
  };

  const decreaseParticipants = () => {
    if (maxParticipants > 2) {
      setMaxParticipants(prev => prev - 1);
    }
  };

  const increaseParticipants = () => {
    if (maxParticipants < 10) {
      setMaxParticipants(prev => prev + 1);
    }
  };

  // 방 선택 시 처리
  const handleRoomPress = (room: Room) => {
    const hasPassword = !!room.roomPassword;
    const isMyRoom = myRooms.some(r => r.roomId === room.roomId);

    if (isMyRoom) {
      navigation.navigate('RoomLobby', { roomId: room.roomId });
      return;
    }

    if (hasPassword) {
      setSelectedRoom(room);
      setInputPassword('');
      setPasswordModalVisible(true);
    } else {
      Alert.alert(
        '방 입장',
        `"${room.roomName}" 방에 입장하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '입장',
            onPress: async () => {
              if (!userId) return;
              try {
                await roomApi.joinRoom(room.roomId, { userId });
                navigation.navigate('RoomLobby', { roomId: room.roomId });
              } catch (error) {
                console.error('failed:', error);
                Alert.alert('오류', '방에 입장할 수 없습니다');
              }
            },
          },
        ]
      );
    }
  };

  const handlePasswordSubmit = async () => {
    if (!userId || !selectedRoom) return;

    const roomId = selectedRoom.roomId;
    setJoining(true);
    try {
      await roomApi.joinRoom(roomId, { userId, password: inputPassword });
      setPasswordModalVisible(false);
      setInputPassword('');
      setSelectedRoom(null);
      navigation.navigate('RoomLobby', { roomId });
    } catch (error: any) {
      const message = error?.response?.data?.message || '비밀번호가 틀렸거나 방에 입장할 수 없습니다';
      Alert.alert('입장 실패', message);
    } finally {
      setJoining(false);
    }
  };

  const renderRoomItem = ({ item }: { item: Room }) => {
    const currentCount = participantCounts.get(item.roomId) || 0;
    const hasPassword = !!item.roomPassword;

    return (
      <TouchableOpacity
        style={styles.roomCard}
        activeOpacity={0.7}
        onPress={() => handleRoomPress(item)}
      >
        <View style={styles.roomHeader}>
          <View style={styles.roomTitleRow}>
            <Text style={styles.roomName} numberOfLines={1}>
              {item.roomName}
            </Text>
            {hasPassword && (
              <Ionicons name="lock-closed" size={14} color="#888" style={styles.lockIcon} />
            )}
          </View>
          <View style={styles.participantBadge}>
            <Ionicons name="people" size={14} color="#1E90FF" />
            <Text style={styles.participantText}>
              {currentCount}/{item.maxParticipants}
            </Text>
          </View>
        </View>
        {item.description && (
          <Text style={styles.roomDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContainer}>
        {(['나의 방 목록', '전체 방 목록'] as TabType[]).map(tab => (
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E90FF" />
        </View>
      ) : (
        <FlatList
          data={activeTab === '나의 방 목록' ? myRooms : allRooms}
          keyExtractor={item => item.roomId.toString()}
          renderItem={renderRoomItem}
          contentContainerStyle={[styles.listContent, { flexGrow: 1 }]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color="#ddd" />
              <Text style={styles.emptyText}>
                {activeTab === '나의 방 목록'
                  ? '참여 중인 방이 없습니다'
                  : '생성된 방이 없습니다'}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>방 만들기</Text>
                <TouchableOpacity onPress={() => {
                  setModalVisible(false);
                  resetModal();
                }}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>방 이름 *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="방 이름을 입력하세요"
                  value={roomName}
                  onChangeText={setRoomName}
                  maxLength={50}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>비밀번호 (선택)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="4자리 숫자 (없으면 공개방)"
                  value={roomPassword}
                  onChangeText={text => setRoomPassword(text.replace(/[^0-9]/g, ''))}
                  maxLength={4}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>모집 인원</Text>
                <View style={styles.counterContainer}>
                  <TouchableOpacity
                    style={[styles.counterBtn, maxParticipants <= 2 && styles.counterBtnDisabled]}
                    onPress={decreaseParticipants}
                    disabled={maxParticipants <= 2}
                  >
                    <Ionicons name="remove" size={20} color={maxParticipants <= 2 ? '#ccc' : '#333'} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{maxParticipants}명</Text>
                  <TouchableOpacity
                    style={[styles.counterBtn, maxParticipants >= 10 && styles.counterBtnDisabled]}
                    onPress={increaseParticipants}
                    disabled={maxParticipants >= 10}
                  >
                    <Ionicons name="add" size={20} color={maxParticipants >= 10 ? '#ccc' : '#333'} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.inputHint}>본인 포함 2~10명</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>방 소개 (선택)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="방에 대한 소개를 입력하세요"
                  value={description}
                  onChangeText={setDescription}
                  maxLength={200}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.createBtn, !roomName.trim() && styles.createBtnDisabled]}
                onPress={handleCreateRoom}
                disabled={!roomName.trim() || creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createBtnText}>방 만들기</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={passwordModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setPasswordModalVisible(false);
          setInputPassword('');
          setSelectedRoom(null);
        }}
      >
        <View style={styles.passwordModalOverlay}>
          <View style={styles.passwordModalContent}>
            <Text style={styles.passwordModalTitle}>비밀번호 입력</Text>
            <Text style={styles.passwordModalSubtitle}>
              "{selectedRoom?.roomName}" 방의 비밀번호를 입력하세요
            </Text>
            <TextInput
              style={styles.passwordInput}
              placeholder="4자리 비밀번호"
              value={inputPassword}
              onChangeText={text => setInputPassword(text.replace(/[^0-9]/g, ''))}
              maxLength={4}
              keyboardType="number-pad"
              secureTextEntry
              autoFocus
            />
            <View style={styles.passwordModalButtons}>
              <TouchableOpacity
                style={styles.passwordCancelBtn}
                onPress={() => {
                  setPasswordModalVisible(false);
                  setInputPassword('');
                  setSelectedRoom(null);
                }}
              >
                <Text style={styles.passwordCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.passwordSubmitBtn, inputPassword.length !== 4 && styles.passwordSubmitBtnDisabled]}
                onPress={handlePasswordSubmit}
                disabled={inputPassword.length !== 4 || joining}
              >
                {joining ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.passwordSubmitText}>입장</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  roomCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flexShrink: 1,
  },
  lockIcon: {
    marginLeft: 6,
  },
  participantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  participantText: {
    fontSize: 13,
    color: '#1E90FF',
    fontWeight: '600',
    marginLeft: 4,
  },
  roomDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E90FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a1a1a',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnDisabled: {
    backgroundColor: '#f8f8f8',
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginHorizontal: 20,
    minWidth: 50,
    textAlign: 'center',
  },
  createBtn: {
    backgroundColor: '#1E90FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  createBtnDisabled: {
    backgroundColor: '#B0D4F1',
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  passwordModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  passwordModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  passwordModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  passwordModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  passwordInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: '#1a1a1a',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 20,
  },
  passwordModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  passwordCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  passwordCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  passwordSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1E90FF',
    alignItems: 'center',
  },
  passwordSubmitBtnDisabled: {
    backgroundColor: '#B0D4F1',
  },
  passwordSubmitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

export default RoomScreen;
