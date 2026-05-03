import { useState, useEffect, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';

export const usePermissions = () => {
  const [status, setStatus] = useState<'loading' | 'granted' | 'denied'>('loading');

  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const foregroundPermissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ];

        // Android 10 이상 동작 인식 권한 추가
        if (Platform.Version >= 29) {
          foregroundPermissions.push(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);
        }

        const granted = await PermissionsAndroid.requestMultiple(foregroundPermissions);
        const hasFineLocation =
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const hasCoarseLocation =
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const hasForegroundLocation = hasFineLocation || hasCoarseLocation;

        if (!hasForegroundLocation) {
          setStatus('denied');
          return;
        }

        setStatus('granted');
      } catch (err) {
        console.warn(err);
        setStatus('denied');
      }
    } else {
      // iOS 권한은 네이티브 API 호출 시 처리됨
      setStatus('granted');
    }
  }, []);

  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  return { status, requestPermissions };
};
