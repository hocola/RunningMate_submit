/**
 * useLocation Hook (위치 추적 및 거리 계산)
 * 
 * - GPS를 통한 실시간 위치 추적
 * - 러닝 중 이동 경로 기록
 * - Haversine 공식을 이용한 거리 계산
 * - 나침반 방향 추적
 * - GPS 내장 speed를 활용한 실시간 속도/페이스 계산
 */

import { useState, useEffect, useRef } from 'react';
import Geolocation from 'react-native-geolocation-service';
import CompassHeading from 'react-native-compass-heading';
import { Coordinate, Region } from '../types';

/**
 * 각도를 라디안으로 변환
 */
const deg2rad = (deg: number) => deg * (Math.PI / 180);

/**
 * Haversine 공식 - 두 GPS 좌표 간 거리 계산
 * 
 * @param lat1 시작점 위도
 * @param lon1 시작점 경도
 * @param lat2 끝점 위도
 * @param lon2 끝점 경도
 * @returns 두 점 사이 거리 (km)
 */
const getDistanceFromLatLonInKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // 지구 반지름 (km)

  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * useLocation Hook
 */
export const useLocation = ({
  permissionStatus,
  isRunning,
  isPaused,
}: {
  permissionStatus: 'loading' | 'granted' | 'denied';
  isRunning: boolean;
  isPaused: boolean;
}) => {

  // 상태 관리
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [heading, setHeading] = useState(0);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);

  // 이전 위치 저장 (거리 계산용)
  const lastLocationRef = useRef<Coordinate | null>(null);

  // 실시간 속도/페이스 관련 상태
  const [recentSpeeds, setRecentSpeeds] = useState<number[]>([]);
  const [realtimeSpeed, setRealtimeSpeed] = useState(0);
  const [realtimePace, setRealtimePace] = useState(0);
  const [lastSpeedUpdateRef, setLastSpeedUpdateRef] = useState(Date.now());

  // 최신 상태 유지를 위한 ref
  const isRunningRef = useRef(isRunning);
  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    isRunningRef.current = isRunning;
    isPausedRef.current = isPaused;
  }, [isRunning, isPaused]);

  // GPS 및 나침반 추적
  useEffect(() => {
    if (permissionStatus !== 'granted') return;

    // 초기 위치 설정
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLoc = { latitude, longitude };
        setCurrentLocation(newLoc);
        setInitialRegion({
          latitude,
          longitude,
          latitudeDelta: 0.003,
          longitudeDelta: 0.003,
        });
      },
      (error) => console.log('Initial location error:', error),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    // 실시간 위치 추적
    const watchId = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed } = position.coords;
        const newLoc = { latitude, longitude };

        setCurrentLocation(newLoc);

        setInitialRegion((prev) => {
          if (prev) return prev;
          return {
            latitude,
            longitude,
            latitudeDelta: 0.003,
            longitudeDelta: 0.003,
          };
        });

        // 러닝 중일 때 경로 기록 및 거리 계산
        if (isRunningRef.current && !isPausedRef.current) {
          setRouteCoordinates((prev) => [...prev, newLoc]);

          if (lastLocationRef.current) {
            const dist = getDistanceFromLatLonInKm(
              lastLocationRef.current.latitude,
              lastLocationRef.current.longitude,
              latitude,
              longitude
            );

            // 급격한 위치 변화 필터링 (GPS 오차 방지)
            if (dist < 0.1) {
              setTotalDistance((prev) => prev + dist);
            }
          }

          lastLocationRef.current = newLoc;

          // GPS 기반 실시간 속도 처리
          if (speed !== null && speed !== undefined && speed >= 0 && speed <= 12) {
            const speedKmh = speed * 3.6;

            setRecentSpeeds((prev) => {
              const updated = [...prev, speedKmh];
              if (updated.length > 5) {
                return updated.slice(-5);
              }
              return updated;
            });

            setLastSpeedUpdateRef(Date.now());
          }
        }
      },
      (error) => console.log('Location error:', error),
      {
        enableHighAccuracy: true,
        distanceFilter: 3,
        interval: 1000,
        fastestInterval: 500
      }
    );

    // 나침반 추적
    CompassHeading.start(
      3,
      ({ heading: newHeading }: { heading: number }) => {
        setHeading(newHeading);
      }
    );

    return () => {
      Geolocation.clearWatch(watchId);
      CompassHeading.stop();
    };
  }, [permissionStatus]);

  // 실시간 속도 및 페이스 계산
  useEffect(() => {
    if (recentSpeeds.length === 0) {
      setRealtimeSpeed(0);
      setRealtimePace(0);
      return;
    }

    const sum = recentSpeeds.reduce((a, b) => a + b, 0);
    const avgSpeed = sum / recentSpeeds.length;

    if (avgSpeed < 0.5) {
      setRealtimeSpeed(0);
      setRealtimePace(0);
    } else {
      setRealtimeSpeed(avgSpeed);
      setRealtimePace(3600 / avgSpeed);
    }
  }, [recentSpeeds]);

  // 정지 상태 감지
  useEffect(() => {
    const interval = setInterval(() => {
      if (isRunningRef.current && !isPausedRef.current) {
        const timeSinceLastUpdate = Date.now() - lastSpeedUpdateRef;
        if (timeSinceLastUpdate > 2000) {
          setRecentSpeeds([]);
          setRealtimeSpeed(0);
          setRealtimePace(0);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastSpeedUpdateRef]);

  // 경로 및 거리 초기화
  const clearRoute = () => {
    setRouteCoordinates([]);
    setTotalDistance(0);
    lastLocationRef.current = null;
    setRecentSpeeds([]);
    setRealtimeSpeed(0);
    setRealtimePace(0);
    setLastSpeedUpdateRef(Date.now());
  };

  return {
    currentLocation,
    routeCoordinates,
    heading,
    initialRegion,
    totalDistance,
    clearRoute,
    realtimeSpeed,
    realtimePace,
  };
};
