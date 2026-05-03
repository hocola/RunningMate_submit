import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { friendApi, User, Friendship } from '../api/friendApi';

/** 탭 종류 타입 정의 */
type TabType = '친구 목록' | '받은 신청' | '친구 찾기';

interface FriendsScreenProps {
  onPendingCountChange?: () => void;
}

const FriendsScreen = ({ onPendingCountChange }: FriendsScreenProps) => {
  // 공통 상태
  const [activeTab, setActiveTab] = useState<TabType>('친구 목록');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  // 친구 목록 탭 상태
  const [friends, setFriends] = useState<User[]>([]);

  // 받은 신청 탭 상태
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [requestUsers, setRequestUsers] = useState<Map<number, User>>(new Map());

  // 친구 찾기 탭 상태
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // 초기화
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

  // 데이터 조회

  const fetchFriends = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await friendApi.getFriends(userId);
      setFriends(data);
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchPendingRequests = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await friendApi.getPendingRequests(userId);
      setPendingRequests(data);

      const userMap = new Map<number, User>();
      for (const request of data) {
        try {
          const user = await friendApi.getUser(request.requesterId);
          userMap.set(request.requesterId, user);
        } catch (e) {
          console.error('Failed to get user info:', e);
        }
      }
      setRequestUsers(userMap);
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (activeTab === '친구 목록') {
      fetchFriends();
    } else if (activeTab === '받은 신청') {
      fetchPendingRequests();
    }
  }, [activeTab, fetchFriends, fetchPendingRequests]);

  // 액션 핸들러

  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    setSearchLoading(true);
    try {
      const data = await friendApi.searchUsers(searchKeyword.trim());
      const filtered = data.filter(
        (user) => user.userId !== userId && !friends.some((f) => f.userId === user.userId)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendRequest = async (receiverId: number) => {
    if (!userId) return;
    try {
      await friendApi.sendFriendRequest(userId, receiverId);
      Alert.alert('성공', '친구 신청을 보냈습니다');
      setSearchResults((prev) => prev.filter((u) => u.userId !== receiverId));
    } catch (error) {
      console.error(error);
      Alert.alert('오류', '친구 신청에 실패했습니다');
    }
  };

  const handleAccept = async (requesterId: number) => {
    if (!userId) return;
    try {
      await friendApi.acceptFriendRequest(requesterId, userId);
      Alert.alert('성공', '친구가 되었습니다');
      fetchPendingRequests();
      onPendingCountChange?.();
    } catch (error) {
      console.error(error);
      Alert.alert('오류', '수락에 실패했습니다');
    }
  };

  const handleReject = async (requesterId: number) => {
    if (!userId) return;
    try {
      await friendApi.rejectFriendRequest(requesterId, userId);
      fetchPendingRequests();
      onPendingCountChange?.();
    } catch (error) {
      console.error(error);
      Alert.alert('오류', '거절에 실패했습니다');
    }
  };

  // 중첩 함수 분리
  const executeDeleteFriend = async (friendId: number) => {
      if (!userId) return;
      try {
        await friendApi.deleteFriend(userId, friendId);
        setFriends((prev) => prev.filter((f) => f.userId !== friendId));
      } catch (error) {
        console.error(error);
        Alert.alert('오류', '삭제에 실패했습니다');
      }
  };

  const handleDeleteFriend = (friendId: number) => {
    Alert.alert('친구 삭제', '정말 이 친구를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => executeDeleteFriend(friendId),
      },
    ]);
  };

  // 렌더링 헬퍼 함수
  
  // 1. 친구 목록 렌더링
  const renderFriendsTab = () => {
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1E90FF" />
            </View>
        );
    }
    if (friends.length > 0) {
        return (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.userId.toString()}
              renderItem={renderFriendItem}
              contentContainerStyle={[styles.listContent, { flexGrow: 1 }]}
            />
        );
    }
    return (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={60} color="#ddd" />
          <Text style={styles.emptyText}>아직 친구가 없습니다</Text>
        </View>
    );
  };

  // 2. 받은 신청 렌더링
  const renderPendingTab = () => {
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1E90FF" />
            </View>
        );
    }
    if (pendingRequests.length > 0) {
        return (
            <FlatList
              data={pendingRequests}
              keyExtractor={(item) => `${item.requesterId}-${item.receiverId}`}
              renderItem={renderPendingItem}
              contentContainerStyle={styles.listContent}
            />
        );
    }
    return (
        <View style={styles.emptyContainer}>
          <Ionicons name="mail-outline" size={60} color="#ddd" />
          <Text style={styles.emptyText}>받은 신청이 없습니다</Text>
        </View>
    );
  };

  // 3. 검색 결과 렌더링
  const renderSearchResults = () => {
      if (searchLoading) {
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1E90FF" />
            </View>
          );
      }
      if (searchResults.length > 0) {
          return (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.userId.toString()}
              renderItem={renderSearchItem}
              contentContainerStyle={styles.listContent}
            />
          );
      }
      if (searchKeyword) {
          return (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={60} color="#ddd" />
              <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
            </View>
          );
      }
      return (
        <View style={styles.emptyContainer}>
            <Ionicons name="people-circle-outline" size={60} color="#ddd" />
            <Text style={styles.emptyText}>닉네임으로 친구를 찾아보세요</Text>
        </View>
      );
  };


  // 리스트 아이템 렌더링
  const renderFriendItem = ({ item }: { item: User }) => (
    <View style={styles.listItem}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={24} color="#888" />
        </View>
        <Text style={styles.nickname}>{item.nickname}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDeleteFriend(item.userId)}
      >
        <Ionicons name="person-remove-outline" size={20} color="#ff6b6b" />
      </TouchableOpacity>
    </View>
  );

  const renderPendingItem = ({ item }: { item: Friendship }) => {
    const requester = requestUsers.get(item.requesterId);
    return (
      <View style={styles.listItem}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#888" />
          </View>
          <Text style={styles.nickname}>{requester?.nickname || '...'}</Text>
        </View>
        <View style={styles.actionBtns}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => handleAccept(item.requesterId)}
          >
            <Text style={styles.acceptBtnText}>수락</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => handleReject(item.requesterId)}
          >
            <Text style={styles.rejectBtnText}>거절</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSearchItem = ({ item }: { item: User }) => (
    <View style={styles.listItem}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={24} color="#888" />
        </View>
        <Text style={styles.nickname}>{item.nickname}</Text>
      </View>
      <TouchableOpacity
        style={[styles.actionBtn, styles.requestBtn]}
        onPress={() => handleSendRequest(item.userId)}
      >
        <Text style={styles.requestBtnText}>친구 신청</Text>
      </TouchableOpacity>
    </View>
  );

  // UI 렌더링
  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 탭 바 */}
      <View style={styles.tabContainer}>
        {(['친구 목록', '받은 신청', '친구 찾기'] as TabType[]).map((tab) => (
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

      {/* ===== 각 탭 콘텐츠 (리팩토링됨) ===== */}
      {activeTab === '친구 목록' && renderFriendsTab()}

      {activeTab === '받은 신청' && renderPendingTab()}

      {activeTab === '친구 찾기' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="닉네임으로 검색"
              value={searchKeyword}
              onChangeText={setSearchKeyword}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
              <Ionicons name="search" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          {/* 검색 결과 렌더링 함수 호출 */}
          {renderSearchResults()}
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
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nickname: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  deleteBtn: {
    padding: 8,
  },
  actionBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  acceptBtn: {
    backgroundColor: '#1E90FF',
  },
  acceptBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  rejectBtn: {
    backgroundColor: '#f0f0f0',
  },
  rejectBtnText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  requestBtn: {
    backgroundColor: '#1E90FF',
  },
  requestBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
  searchContainer: {
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    marginRight: 10,
  },
  searchBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#1E90FF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FriendsScreen;
