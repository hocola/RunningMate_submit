import { apiClient } from './authApi';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RunningRecordRequest {
  userId: number;
  roomId?: number | null;
  totalDistanceM: number;
  durationSeconds: number;
  avgPaceSeconds?: number;
  avgSpeedKmh?: number;
  startedAt: string;
  endedAt: string;
  route?: Coordinate[];  // 경로 좌표 추가
}

export interface RunningRecordResponse {
  recordId: number;
  userId: number;
  roomId?: number | null;
  totalDistanceM: number;
  durationSeconds: number;
  avgPaceSeconds?: number;
  avgSpeedKmh?: number;
  avgHeartRate?: number;
  calories?: number;
  startedAt: string;
  endedAt: string;
}

export interface LocationLog {
  recordId: number;
  seq: number;
  latitude: number;
  longitude: number;
}

export const runningApi = {
  // 러닝 기록 + 경로 함께 저장
  saveRecordWithRoute: async (record: RunningRecordRequest): Promise<RunningRecordResponse> => {
    try {
      const response = await apiClient.post('/records/with-route', record);
      return response.data;
    } catch (error) {
      console.error('Save Record With Route Error:', error);
      throw error;
    }
  },

  // 러닝 기록 저장 (기존 호환)
  saveRecord: async (record: Omit<RunningRecordRequest, 'route'>): Promise<RunningRecordResponse> => {
    try {
      const response = await apiClient.post('/records', record);
      return response.data;
    } catch (error) {
      console.error('Save Record Error:', error);
      throw error;
    }
  },
 
  // 전체 기록 조회
  getUserRecords: async (userId: number): Promise<RunningRecordResponse[]> => {
    try {
      const response = await apiClient.get(`/records/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get User Records Error:', error);
      throw error;
    }
  },

  // 주간 기록 조회
  getWeeklyRecords: async (userId: number, startDate: string): Promise<RunningRecordResponse[]> => {
    try {
      const response = await apiClient.get(`/records/user/${userId}/weekly`, {
        params: { startDate }
      });
      return response.data;
    } catch (error) {
      console.error('Get Weekly Records Error:', error);
      throw error;
    }
  },

  // 월간 기록 조회
  getMonthlyRecords: async (userId: number, year: number, month: number): Promise<RunningRecordResponse[]> => {
    try {
      const response = await apiClient.get(`/records/user/${userId}/monthly`, {
        params: { year, month }
      });
      return response.data;
    } catch (error) {
      console.error('Get Monthly Records Error:', error);
      throw error;
    }
  },

  // 연간 기록 조회
  getYearlyRecords: async (userId: number, year: number): Promise<RunningRecordResponse[]> => {
    try {
      const response = await apiClient.get(`/records/user/${userId}/yearly`, {
        params: { year }
      });
      return response.data;
    } catch (error) {
      console.error('Get Yearly Records Error:', error);
      throw error;
    }
  },

  // 특정 기록 상세 조회
  getRecord: async (recordId: number): Promise<RunningRecordResponse> => {
    try {
      const response = await apiClient.get(`/records/${recordId}`);
      return response.data;
    } catch (error) {
      console.error('Get Record Error:', error);
      throw error;
    }
  },

  // 경로 데이터 조회
  getRoute: async (recordId: number): Promise<LocationLog[]> => {
    try {
      const response = await apiClient.get(`/records/${recordId}/route`);
      return response.data;
    } catch (error) {
      console.error('Get Route Error:', error);
      throw error;
    }
  },

  // 방(팀) 기록 조회 관련 API
  getRoomRecords: async (roomId: number): Promise<RunningRecordResponse[]> => {
    try {
      const response = await apiClient.get(`/records/room/${roomId}`);
      return response.data;
    } catch (error) {
      console.error('Get Room Records Error:', error);
      throw error;
    }
  },

  // 방 주간 기록 조회
  getRoomWeeklyRecords: async (roomId: number, startDate: string): Promise<RunningRecordResponse[]> => {
    try {
      const response = await apiClient.get(`/records/room/${roomId}/weekly`, {
        params: { startDate }
      });
      return response.data;
    } catch (error) {
      console.error('Get Room Weekly Records Error:', error);
      throw error;
    }
  },

  // 방 월간 기록 조회
  getRoomMonthlyRecords: async (roomId: number, year: number, month: number): Promise<RunningRecordResponse[]> => {
    try {
      const response = await apiClient.get(`/records/room/${roomId}/monthly`, {
        params: { year, month }
      });
      return response.data;
    } catch (error) {
      console.error('Get Room Monthly Records Error:', error);
      throw error;
    }
  },

  // 방 연간 기록 조회
  getRoomYearlyRecords: async (roomId: number, year: number): Promise<RunningRecordResponse[]> => {
    try {
      const response = await apiClient.get(`/records/room/${roomId}/yearly`, {
        params: { year }
      });
      return response.data;
    } catch (error) {
      console.error('Get Room Yearly Records Error:', error);
      throw error;
    }
  },

  // 함께 뛴 사람 조회
  getRunningPartners: async (recordId: number): Promise<any[]> => {
    try {
      const response = await apiClient.get(`/records/${recordId}/partners`);
      return response.data;
    } catch (error) {
      console.error('Get Running Partners Error:', error);
      throw error;
    }
  },
};
