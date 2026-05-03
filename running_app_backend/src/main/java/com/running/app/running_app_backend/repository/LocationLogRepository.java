package com.running.app.running_app_backend.repository;

import com.running.app.running_app_backend.domain.LocationLog;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

// 위치 기록 데이터 접근 리포지토리
public interface LocationLogRepository extends ReactiveCrudRepository<LocationLog, Void> {

    // 특정 기록의 경로 좌표 조회
    @Query("SELECT * FROM location_logs WHERE record_id = :recordId ORDER BY seq ASC")
    Flux<LocationLog> findByRecordIdOrderBySeqAsc(Long recordId);

    // 특정 기록의 마지막 seq 조회
    @Query("SELECT COALESCE(MAX(seq), 0) FROM location_logs WHERE record_id = :recordId")
    Mono<Integer> findMaxSeqByRecordId(Long recordId);

    // 특정 기록의 모든 위치 로그 삭제
    @Query("DELETE FROM location_logs WHERE record_id = :recordId")
    Mono<Void> deleteByRecordId(Long recordId);
}
