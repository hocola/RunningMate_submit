import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NaverLogin from '@react-native-seoul/naver-login';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { friendApi } from '../api/friendApi';

interface UserInfo {
  userId: number;
  nickname: string;
  email: string;
}

const SettingsScreen = () => {
  const navigation = useNavigation();

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [nicknameAvailable, setNicknameAvailable] = useState(false);
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [savingNickname, setSavingNickname] = useState(false);

  // 사용자 정보 불러오기
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setUserInfo(user);
        }
      } catch (error) {
        console.error('Failed to load user info:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUserInfo();
  }, []);

  // 닉네임 중복 체크
  const checkNickname = useCallback(async (nickname: string) => {
    if (!nickname.trim() || nickname === userInfo?.nickname) {
      setNicknameError('');
      setNicknameAvailable(false);
      return;
    }

    if (nickname.length < 2) {
      setNicknameError('2자 이상 입력해주세요');
      setNicknameAvailable(false);
      return;
    }

    if (nickname.length > 20) {
      setNicknameError('20자 이하로 입력해주세요');
      setNicknameAvailable(false);
      return;
    }

    setCheckingNickname(true);
    try {
      const available = await friendApi.checkNickname(nickname.trim());
      if (!available) {
        setNicknameError('이미 사용 중인 닉네임입니다');
        setNicknameAvailable(false);
      } else {
        setNicknameError('');
        setNicknameAvailable(true);
      }
    } catch (error) {
      console.error('Check nickname error:', error);
      setNicknameAvailable(false);
    } finally {
      setCheckingNickname(false);
    }
  }, [userInfo?.nickname]);

  // 디바운싱 처리
  useEffect(() => {
    if (!isEditing) return;
    const timer = setTimeout(() => {
      checkNickname(editNickname);
    }, 500);
    return () => clearTimeout(timer);
  }, [editNickname, isEditing, checkNickname]);

  const startEditing = () => {
    if (userInfo) {
      setEditNickname(userInfo.nickname);
      setNicknameError('');
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditNickname('');
    setNicknameError('');
    setNicknameAvailable(false);
    Keyboard.dismiss();
  };

  // 닉네임 변경 요청
  const saveNickname = async () => {
    if (!userInfo || nicknameError || checkingNickname) return;
    const trimmed = editNickname.trim();
    if (trimmed === userInfo.nickname) {
      cancelEditing();
      return;
    }

    if (trimmed.length < 2) {
      setNicknameError('2자 이상 입력해주세요');
      return;
    }

    setSavingNickname(true);
    try {
      const updatedUser = await friendApi.updateNickname(userInfo.userId, trimmed);
      const newUserInfo = { ...userInfo, nickname: updatedUser.nickname };
      setUserInfo(newUserInfo);
      await AsyncStorage.setItem('user', JSON.stringify(newUserInfo));
      setIsEditing(false);
      Keyboard.dismiss();
    } catch (error: any) {
      if (error.message === 'DUPLICATE') {
        setNicknameError('이미 사용 중인 닉네임입니다');
      } else {
        Alert.alert('오류', '닉네임 변경에 실패했습니다');
      }
    } finally {
      setSavingNickname(false);
    }
  };

  // 로그아웃
  const handleLogout = async () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            try {
              try {
                await NaverLogin.deleteToken();
              } catch (naverError) {
                console.log('Naver deleteToken error (ignored):', naverError);
              }
              await AsyncStorage.removeItem('accessToken');
              await AsyncStorage.removeItem('user');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' as never }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('오류', '로그아웃 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  // 회원 탈퇴
  const handleDeleteAccount = async () => {
    Alert.alert(
      '회원 탈퇴',
      '모든 정보가 사라지며 복구가 불가능합니다.\n탈퇴하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          style: 'destructive',
          onPress: async () => {
            if (!userInfo) return;
            try {
              await friendApi.deleteUser(userInfo.userId);
            } catch (error: any) {
              if (!error?.message?.includes('header name')) {
                console.error('Delete account error:', error);
                Alert.alert('오류', '회원 탈퇴 중 오류가 발생했습니다.');
                return;
              }
            }
            try {
              await NaverLogin.deleteToken();
            } catch (naverError) {
              console.log('Naver deleteToken error (ignored):', naverError);
            }
            await AsyncStorage.removeItem('accessToken');
            await AsyncStorage.removeItem('user');
            Alert.alert('완료', '회원 탈퇴가 완료되었습니다.', [
              {
                text: '확인',
                onPress: () => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' as never }],
                  });
                },
              },
            ]);
          },
        },
      ]
    );
  };

  const canSave = editNickname.trim().length >= 2 && !nicknameError && !checkingNickname;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>설정</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.userInfoSection}>
        {loading ? (
          <ActivityIndicator size="small" color="#1E90FF" />
        ) : userInfo ? (
          <>
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={70} color="#1E90FF" />
            </View>

            {isEditing ? (
              <View style={styles.editContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.nicknameInput,
                      nicknameError ? styles.inputError : null,
                    ]}
                    value={editNickname}
                    onChangeText={setEditNickname}
                    placeholder="닉네임 입력"
                    autoFocus
                    maxLength={20}
                    returnKeyType="done"
                    onSubmitEditing={saveNickname}
                  />
                  {checkingNickname && (
                    <ActivityIndicator
                      size="small"
                      color="#1E90FF"
                      style={styles.inputSpinner}
                    />
                  )}
                </View>

                {nicknameError ? (
                  <Text style={styles.errorText}>{nicknameError}</Text>
                ) : nicknameAvailable ? (
                  <Text style={styles.successText}>사용 가능한 닉네임입니다</Text>
                ) : null}

                <View style={styles.editButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={cancelEditing}
                  >
                    <Text style={styles.cancelButtonText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      !canSave && styles.saveButtonDisabled,
                    ]}
                    onPress={saveNickname}
                    disabled={!canSave || savingNickname}
                  >
                    {savingNickname ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>저장</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.nicknameContainer}
                onPress={startEditing}
                activeOpacity={0.7}
              >
                <Text style={styles.nickname}>{userInfo.nickname}</Text>
                <Ionicons
                  name="pencil"
                  size={16}
                  color="#888"
                  style={styles.editIcon}
                />
              </TouchableOpacity>
            )}

            <Text style={styles.email}>{userInfo.email}</Text>
          </>
        ) : (
          <Text style={styles.email}>사용자 정보를 불러올 수 없습니다</Text>
        )}
      </View>

      <View style={styles.spacer} />

      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={24} color="#999" />
          <Text style={styles.deleteText}>탈퇴하기</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfoSection: {
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 8,
    borderBottomColor: '#f5f5f5',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  nicknameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  nickname: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  editIcon: {
    marginLeft: 6,
  },
  email: {
    fontSize: 14,
    color: '#888',
    marginTop: 6,
  },
  editContainer: {
    width: '80%',
    alignItems: 'center',
  },
  inputWrapper: {
    width: '100%',
    position: 'relative',
  },
  nicknameInput: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  inputSpinner: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -10,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    marginTop: 6,
  },
  successText: {
    color: '#34C759',
    fontSize: 13,
    marginTop: 6,
  },
  editButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#1E90FF',
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#B0D4F1',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    borderTopWidth: 8,
    borderTopColor: '#f5f5f5',
    paddingBottom: '12%',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
    marginLeft: 12,
  },
  deleteText: {
    fontSize: 16,
    color: '#999',
    marginLeft: 12,
  },
});

export default SettingsScreen;
