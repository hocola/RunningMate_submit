import { useState, useEffect, useCallback, useRef } from 'react';

export const useRunning = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [runTime, setRunTime] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [pausedAccumulatedMs, setPausedAccumulatedMs] = useState(0);
  const pausedAtRef = useRef<number | null>(null);

  // 백그라운드 전환을 고려하여 현재 시간을 기준으로 경과 시간 계산
  useEffect(() => {
    if (!isRunning || !startedAt) return;

    const updateElapsed = () => {
      const nowMs = Date.now();
      const activeElapsedMs = nowMs - startedAt.getTime();
      const currentPausedMs =
        pausedAtRef.current !== null ? nowMs - pausedAtRef.current : 0;
      const elapsedSec = Math.floor(
        Math.max(0, activeElapsedMs - pausedAccumulatedMs - currentPausedMs) / 1000
      );
      setRunTime(elapsedSec);
    };

    updateElapsed();

    let interval: ReturnType<typeof setInterval> | null = null;
    if (!isPaused) {
      interval = setInterval(updateElapsed, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPaused, startedAt, pausedAccumulatedMs]);

  const startRun = useCallback(() => {
    const now = Date.now();
    setIsRunning(true);
    setIsPaused(false);
    setRunTime(0);
    setStartedAt(new Date(now));
    setPausedAccumulatedMs(0);
    pausedAtRef.current = null;
  }, []);

  const pauseRun = useCallback(() => {
    if (!isRunning || isPaused) return;
    pausedAtRef.current = Date.now();
    setIsPaused(true);
  }, [isRunning, isPaused]);

  const resumeRun = useCallback(() => {
    if (!isRunning || !isPaused) return;
    if (pausedAtRef.current !== null) {
      setPausedAccumulatedMs((prev) => prev + (Date.now() - pausedAtRef.current!));
      pausedAtRef.current = null;
    }
    setIsPaused(false);
  }, [isRunning, isPaused]);

  const stopRun = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setRunTime(0);
    setStartedAt(null);
    setPausedAccumulatedMs(0);
    pausedAtRef.current = null;
  }, []);

  return {
    isRunning,
    isPaused,
    runTime,
    startedAt,
    startRun,
    pauseRun,
    resumeRun,
    stopRun,
  };
};
