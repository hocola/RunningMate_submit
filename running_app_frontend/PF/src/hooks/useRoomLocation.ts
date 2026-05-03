/**
 * useRoomLocation Hook (방 실시간 위치 공유)
 * 
 * - WebSocket을 통한 실시간 위치 공유
 * - 팀원들의 위치 및 러닝 상태 관리
 * - Redis Pub/Sub을 통한 다중 서버 지원
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Coordinate } from '../types';
import { WS_BASE_URL } from '../config';

/**
 * 팀원 위치 정보
 */
export interface TeammateLocation {
  userId: number;
  nickname: string;
  latitude: number;
  longitude: number;
  distance: number;
  duration: number;
  speed: number;
  pace: number;
  isPaused: boolean;
  lastUpdated: Date;
}

/**
 * Hook 옵션
 */
interface UseRoomLocationOptions {
  roomId: number;
  userId: number;
  nickname: string;
  isRunning: boolean;
  isPaused: boolean;
  currentLocation: Coordinate | null;
  totalDistance: number;
  runTime: number;
  currentSpeed: number;
  currentPace: number;
}

/**
 * Hook 반환값
 */
interface UseRoomLocationReturn {
  teammates: TeammateLocation[];
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export const useRoomLocation = ({
  roomId,
  userId,
  nickname,
  isRunning,
  isPaused,
  currentLocation,
  totalDistance,
  runTime,
  currentSpeed,
  currentPace,
}: UseRoomLocationOptions): UseRoomLocationReturn => {

  // 상태 관리
  const [teammates, setTeammates] = useState<TeammateLocation[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Refs 관리
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 최신 상태 참조용 refs
  const isRunningRef = useRef(isRunning);
  const isPausedRef = useRef(isPaused);
  const currentLocationRef = useRef(currentLocation);
  const totalDistanceRef = useRef(totalDistance);
  const runTimeRef = useRef(runTime);
  const currentSpeedRef = useRef(currentSpeed);
  const currentPaceRef = useRef(currentPace);

  // refs 업데이트
  useEffect(() => {
    isRunningRef.current = isRunning;
    isPausedRef.current = isPaused;
    currentLocationRef.current = currentLocation;
    totalDistanceRef.current = totalDistance;
    runTimeRef.current = runTime;
    currentSpeedRef.current = currentSpeed;
    currentPaceRef.current = currentPace;
  }, [isRunning, isPaused, currentLocation, totalDistance, runTime, currentSpeed, currentPace]);

  // WebSocket 연결
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    console.log('[WS] Connecting to', WS_BASE_URL);
    const ws = new WebSocket(WS_BASE_URL);

    ws.onopen = () => {
      console.log('[WS] Connected');
      setIsConnected(true);

      // join 메시지 전송
      const joinMsg = JSON.stringify({
        type: 'join',
        roomId: roomId.toString(),
        userId: userId.toString(),
        nickname,
      });
      ws.send(joinMsg);
      console.log('[WS] Sent join:', joinMsg);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WS] Received:', data);

        if (data.type === 'hello') {
          // 서버 연결 확인
          console.log('[WS] Server hello received');
        } else if (data.type === 'joined') {
          // 방 입장 확인
          console.log('[WS] Joined room:', data.roomId);
        } else if (data.type === 'loc') {
          // 팀원 위치 업데이트
          const senderId = parseInt(data.userId);

          // 본인 위치 무시
          if (senderId === userId) return;

          setTeammates((prev) => {
            const existing = prev.find((t) => t.userId === senderId);

            const updatedTeammate: TeammateLocation = {
              userId: senderId,
              nickname: data.nickname || `User ${senderId}`,
              latitude: parseFloat(data.lat),
              longitude: parseFloat(data.lng),
              distance: parseFloat(data.distance) || 0,
              duration: parseInt(data.duration) || 0,
              speed: parseFloat(data.speed) || 0,
              pace: parseFloat(data.pace) || 0,
              isPaused: data.isPaused === true || data.isPaused === 'true',
              lastUpdated: new Date(),
            };

            if (existing) {
              return prev.map((t) =>
                t.userId === senderId ? updatedTeammate : t
              );
            } else {
              return [...prev, updatedTeammate];
            }
          });
        } else if (data.type === 'left') {
          // 팀원이 떠났을 때 목록에서 제거
          const leftUserId = parseInt(data.userId);
          console.log('[WS] User left:', leftUserId);
          setTeammates((prev) => prev.filter((t) => t.userId !== leftUserId));
        }
      } catch (e) {
        console.warn('[WS] Parse error:', e);
      }
    };

    ws.onerror = (error: Event) => {
      console.error('[WS] Error occurred. URL:', WS_BASE_URL);
      console.error('[WS] ReadyState:', ws.readyState);
    };

    ws.onclose = (event: CloseEvent) => {
      console.log('[WS] Disconnected. Code:', event.code, 'Reason:', event.reason || '(no reason)');
      setIsConnected(false);

      // 비정상 종료 시 재연결 시도 (5초 후)
      if (event.code !== 1000 && event.code !== 1001) {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (wsRef.current === ws) {
            console.log('[WS] Attempting reconnect...');
            connect();
          }
        }, 5000);
      }
    };

    wsRef.current = ws;
  }, [roomId, userId, nickname]);

  // WebSocket 연결 해제
  const disconnect = useCallback(() => {
    // 타이머 및 인터벌 취소
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }

    // leave 메시지 전송 및 연결 종료
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const leaveMsg = JSON.stringify({
        type: 'leave',
        roomId: roomId.toString(),
        userId: userId.toString(),
      });
      wsRef.current.send(leaveMsg);
      wsRef.current.close();
    }

    wsRef.current = null;
    setIsConnected(false);
    setTeammates([]);
  }, [roomId, userId]);

  // 위치 전송 (러닝 중일 때만)
  useEffect(() => {
    if (!isConnected || !isRunning) {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
      return;
    }

    // 3초마다 위치 전송
    const sendLocation = () => {
      if (
        wsRef.current?.readyState === WebSocket.OPEN &&
        currentLocationRef.current &&
        isRunningRef.current
      ) {
        const locMsg = JSON.stringify({
          type: 'loc',
          roomId: roomId.toString(),
          userId: userId.toString(),
          nickname,
          lat: currentLocationRef.current.latitude,
          lng: currentLocationRef.current.longitude,
          distance: totalDistanceRef.current,
          duration: runTimeRef.current,
          speed: currentSpeedRef.current,
          pace: currentPaceRef.current,
          isPaused: isPausedRef.current,
        });
        wsRef.current.send(locMsg);
        console.log('[WS] Sent loc:', locMsg);
      }
    };

    sendLocation();
    locationIntervalRef.current = setInterval(sendLocation, 3000);

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    };
  }, [isConnected, isRunning, roomId, userId, nickname]);

  // 비활성 팀원 제거 (30초 이상 업데이트가 없는 경우)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      setTeammates((prev) =>
        prev.filter((t) => {
          const diff = now.getTime() - t.lastUpdated.getTime();
          return diff < 30000;
        })
      );
    }, 10000);

    return () => clearInterval(cleanupInterval);
  }, []);

  // 클린업
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    teammates,
    isConnected,
    connect,
    disconnect,
  };
};
