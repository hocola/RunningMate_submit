/**
 * roomApi (러닝 방 관련 API)
 * 
 * - 러닝 방 CRUD (생성, 조회, 입장, 퇴장)
 * - 참가자 관리
 */

import { apiClient } from './authApi';

// 타입 정의

/**
 * 러닝 방 정보
 */
export interface Room {
  roomId: number;
  hostUserId: number;
  roomName: string;
  roomPassword: string | null;
  maxParticipants: number;
  description: string | null;
  createdAt: string;
  isDeleted: boolean;
}

/**
 * 방 생성 요청
 */
export interface CreateRoomRequest {
  hostUserId: number;
  roomName: string;
  roomPassword?: string | null;
  maxParticipants: number;
  description?: string | null;
}

/**
 * 방 입장 요청
 */
export interface JoinRoomRequest {
  userId: number;
  password?: string | null;
}

/**
 * 방 참가자 정보
 */
export interface RoomParticipant {
  roomId: number;
  userId: number;
  joinedAt: string;
}

// API 함수

export const roomApi = {
  /**
   * 방 생성
   */
  createRoom: async (request: CreateRoomRequest): Promise<Room> => {
    try {
      const response = await apiClient.post('/rooms', request);
      return response.data;
    } catch (error) {
      console.error('Create Room Error:', error);
      throw error;
    }
  },

  /**
   * 전체 활성 방 목록 조회
   */
  getAllRooms: async (): Promise<Room[]> => {
    try {
      const response = await apiClient.get('/rooms');
      return response.data;
    } catch (error) {
      console.error('Get All Rooms Error:', error);
      throw error;
    }
  },

  /**
   * 나의 방 목록 조회
   */
  getMyRooms: async (userId: number): Promise<Room[]> => {
    try {
      const response = await apiClient.get(`/rooms/my/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get My Rooms Error:', error);
      throw error;
    }
  },

  /**
   * 방 상세 조회
   */
  getRoom: async (roomId: number): Promise<Room> => {
    try {
      const response = await apiClient.get(`/rooms/${roomId}`);
      return response.data;
    } catch (error) {
      console.error('Get Room Error:', error);
      throw error;
    }
  },

  /**
   * 방 입장
   */
  joinRoom: async (roomId: number, request: JoinRoomRequest): Promise<RoomParticipant> => {
    const response = await apiClient.post(`/rooms/${roomId}/join`, request);
    return response.data;
  },

  /**
   * 방 퇴장
   */
  leaveRoom: async (roomId: number, userId: number): Promise<void> => {
    try {
      await apiClient.post(`/rooms/${roomId}/leave?userId=${userId}`);
    } catch (error) {
      console.error('Leave Room Error:', error);
      throw error;
    }
  },

  /**
   * 참가자 목록 조회
   */
  getParticipants: async (roomId: number): Promise<RoomParticipant[]> => {
    try {
      const response = await apiClient.get(`/rooms/${roomId}/participants`);
      return response.data;
    } catch (error) {
      console.error('Get Participants Error:', error);
      throw error;
    }
  },

  /**
   * 현재 참가자 수 조회
   */
  getParticipantCount: async (roomId: number): Promise<number> => {
    try {
      const response = await apiClient.get(`/rooms/${roomId}/count`);
      return response.data;
    } catch (error) {
      console.error('Get Participant Count Error:', error);
      throw error;
    }
  },
};
