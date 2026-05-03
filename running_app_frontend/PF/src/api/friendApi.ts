/**
 * friendApi (친구 및 사용자 관련 API)
 * 
 * - 친구 관계 CRUD (신청, 수락, 거절, 삭제)
 * - 사용자 검색 및 정보 조회
 * - 회원 관리 기능 (닉네임 변경, 탈퇴 등)
 */

import { apiClient } from './authApi';

// 타입 정의

/**
 * 사용자 정보
 */
export interface User {
  userId: number;
  nickname: string;
  email?: string;
  createdAt?: string;
}

/**
 * 친구 관계 정보
 */
export interface Friendship {
  requesterId: number;
  receiverId: number;
  status: 'pending' | 'accepted' | 'rejected';
}

// API 함수

export const friendApi = {

  // 친구 관계 API

  /**
   * 내 친구 목록 조회
   */
  getFriends: async (userId: number): Promise<User[]> => {
    try {
      const response = await apiClient.get(`/friendships/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get Friends Error:', error);
      throw error;
    }
  },

  /**
   * 받은 친구 신청 목록 조회
   */
  getPendingRequests: async (userId: number): Promise<Friendship[]> => {
    try {
      const response = await apiClient.get(`/friendships/pending/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get Pending Requests Error:', error);
      throw error;
    }
  },

  /**
   * 친구 신청 보내기
   */
  sendFriendRequest: async (requesterId: number, receiverId: number): Promise<Friendship> => {
    try {
      const response = await apiClient.post('/friendships/request', {
        requesterId,
        receiverId,
      });
      return response.data;
    } catch (error) {
      console.error('Send Friend Request Error:', error);
      throw error;
    }
  },

  /**
   * 친구 신청 수락
   */
  acceptFriendRequest: async (requesterId: number, receiverId: number): Promise<void> => {
    try {
      await apiClient.post('/friendships/accept', {
        requesterId,
        receiverId,
      });
    } catch (error) {
      console.error('Accept Friend Request Error:', error);
      throw error;
    }
  },

  /**
   * 친구 신청 거절
   */
  rejectFriendRequest: async (requesterId: number, receiverId: number): Promise<void> => {
    try {
      await apiClient.post('/friendships/reject', {
        requesterId,
        receiverId,
      });
    } catch (error) {
      console.error('Reject Friend Request Error:', error);
      throw error;
    }
  },

  /**
   * 친구 삭제
   */
  deleteFriend: async (userId1: number, userId2: number): Promise<void> => {
    try {
      await apiClient.delete(`/friendships?userId1=${userId1}&userId2=${userId2}`);
    } catch (error: any) {
      // 204 응답 또는 header 관련 에러 처리
      if (error?.response?.status === 204 || error?.message?.includes('header name')) {
        return;
      }
      console.error('Delete Friend Error:', error);
      throw error;
    }
  },

  // 사용자 검색 및 조회 API

  /**
   * 닉네임으로 사용자 검색
   */
  searchUsers: async (nickname: string): Promise<User[]> => {
    try {
      const response = await apiClient.get('/users/search', {
        params: { nickname },
      });
      return response.data;
    } catch (error) {
      console.error('Search Users Error:', error);
      throw error;
    }
  },

  /**
   * 사용자 정보 조회
   */
  getUser: async (userId: number): Promise<User> => {
    try {
      const response = await apiClient.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get User Error:', error);
      throw error;
    }
  },

  // 회원 관리 API

  /**
   * 회원 탈퇴
   */
  deleteUser: async (userId: number): Promise<void> => {
    try {
      await apiClient.delete(`/users/${userId}`);
    } catch (error: any) {
      if (error?.message?.includes('header name')) {
        return;
      }
      console.error('Delete User Error:', error);
      throw error;
    }
  },

  /**
   * 닉네임 중복 확인
   */
  checkNickname: async (nickname: string): Promise<boolean> => {
    try {
      const response = await apiClient.get('/users/check-nickname', {
        params: { nickname },
      });
      return response.data.available;
    } catch (error) {
      console.error('Check Nickname Error:', error);
      throw error;
    }
  },

  /**
   * 닉네임 변경
   */
  updateNickname: async (userId: number, nickname: string): Promise<User> => {
    try {
      const response = await apiClient.patch(`/users/${userId}/nickname`, {
        nickname,
      });
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 409) {
        throw new Error('DUPLICATE');
      }
      console.error('Update Nickname Error:', error);
      throw error;
    }
  },
};
