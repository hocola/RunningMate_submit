package com.running.app.running_app_backend.service;

import com.running.app.running_app_backend.controller.RunningRecordController.CoordinateDto;
import com.running.app.running_app_backend.domain.LocationLog;
import com.running.app.running_app_backend.domain.RunningRecord;
import com.running.app.running_app_backend.domain.User;
import com.running.app.running_app_backend.repository.LocationLogRepository;
import com.running.app.running_app_backend.repository.RunningRecordRepository;
import com.running.app.running_app_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

// 러닝 기록 서비스 로직
@Service
@RequiredArgsConstructor
public class RunningRecordService {

    private final RunningRecordRepository runningRecordRepository;
    private final LocationLogRepository locationLogRepository;
    private final UserRepository userRepository;

    // 러닝 기록 저장
    public Mono<RunningRecord> createRecord(RunningRecord record) {
        return runningRecordRepository.save(record);
    }

    // 러닝 기록 및 경로 데이터 저장
    public Mono<RunningRecord> createRecordWithRoute(RunningRecord record, List<CoordinateDto> route) {
        return runningRecordRepository.save(record)
                .flatMap(savedRecord -> {
                    if (route == null || route.isEmpty()) {
                        return Mono.just(savedRecord);
                    }

                    // 경로 정보를 LocationLog로 변환하여 저장
                    AtomicInteger seq = new AtomicInteger(0);
                    return Flux.fromIterable(route)
                            .flatMap(coord -> {
                                LocationLog log = new LocationLog();
                                log.setRecordId(savedRecord.getRecordId());
                                log.setSeq(seq.getAndIncrement());
                                log.setLatitude(coord.latitude);
                                log.setLongitude(coord.longitude);
                                return locationLogRepository.save(log);
                            })
                            .then(Mono.just(savedRecord));
                });
    }

    // 러닝 기록 상세 조회
    public Mono<RunningRecord> findById(Long recordId) {
        return runningRecordRepository.findById(recordId);
    }

    // 사용자의 러닝 기록 목록 조회
    public Flux<RunningRecord> findByUserId(Long userId) {
        return runningRecordRepository.findByUserIdOrderByStartedAtDesc(userId);
    }

    // 특정 기간의 러닝 기록 조회
    public Flux<RunningRecord> findByUserIdAndDateRange(Long userId, LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(23, 59, 59);
        return runningRecordRepository.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(userId, start, end);
    }

    // 함께 뛴 러닝 메이트 정보 조회
    public Flux<User> findRunningPartners(Long recordId) {
        return runningRecordRepository.findById(recordId)
                .flatMapMany(record -> {
                    if (record.getRoomId() == null) {
                        return Flux.empty();
                    }

                    // 동일한 방의 다른 참여자 정보 조회
                    return runningRecordRepository.findByRoomId(record.getRoomId())
                            .filter(r -> !r.getRecordId().equals(recordId))
                            .map(RunningRecord::getUserId)
                            .distinct()
                            .flatMap(userRepository::findById);
                });
    }

    // 위치 로그 추가
    public Mono<LocationLog> addLocationLog(Long recordId, Double latitude, Double longitude) {
        return locationLogRepository.findMaxSeqByRecordId(recordId)
                .flatMap(maxSeq -> {
                    LocationLog log = new LocationLog();
                    log.setRecordId(recordId);
                    log.setSeq(maxSeq + 1);
                    log.setLatitude(latitude);
                    log.setLongitude(longitude);
                    return locationLogRepository.save(log);
                });
    }

    // 러닝 경로 조회
    public Flux<LocationLog> getRoute(Long recordId) {
        return locationLogRepository.findByRecordIdOrderBySeqAsc(recordId);
    }

    // 러닝 기록 삭제
    public Mono<Void> deleteRecord(Long recordId) {
        return runningRecordRepository.deleteById(recordId);
    }

    // 특정 방의 러닝 기록 조회
    public Flux<RunningRecord> findByRoomId(Long roomId) {
        return runningRecordRepository.findByRoomId(roomId);
    }

    // 특정 방의 기간별 기록 조회
    public Flux<RunningRecord> findByRoomIdAndDateRange(Long roomId, LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = endDate.atTime(23, 59, 59);
        return runningRecordRepository.findByRoomIdAndStartedAtBetweenOrderByStartedAtDesc(roomId, start, end);
    }
}
