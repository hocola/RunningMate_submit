package com.running.app.running_app_backend.repository;

import com.running.app.running_app_backend.domain.RunningRecord;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

import java.time.LocalDateTime;

// 러닝 기록 리포지토리
public interface RunningRecordRepository extends ReactiveCrudRepository<RunningRecord, Long> {

    // 사용자의 모든 러닝 기록 조회
    Flux<RunningRecord> findByUserId(Long userId);

    // 특정 방의 모든 러닝 기록 조회
    Flux<RunningRecord> findByRoomId(Long roomId);

    // 사용자의 러닝 기록 최신순 조회
    Flux<RunningRecord> findByUserIdOrderByStartedAtDesc(Long userId);

    // 특정 기간의 사용자 러닝 기록 최신순 조회
    Flux<RunningRecord> findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(
            Long userId, LocalDateTime start, LocalDateTime end);

    // 특정 방의 기간별 러닝 기록 최신순 조회
    Flux<RunningRecord> findByRoomIdAndStartedAtBetweenOrderByStartedAtDesc(
            Long roomId, LocalDateTime start, LocalDateTime end);

    // 특정 방의 러닝 기록 최신순 조회
    Flux<RunningRecord> findByRoomIdOrderByStartedAtDesc(Long roomId);
}
