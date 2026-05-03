package com.running.app.running_app_backend.controller;

import com.running.app.running_app_backend.domain.LocationLog;
import com.running.app.running_app_backend.domain.RunningRecord;
import com.running.app.running_app_backend.domain.User;
import com.running.app.running_app_backend.service.RunningRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

// 러닝 기록 및 경로 관리 API
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/records")
public class RunningRecordController {

    private final RunningRecordService runningRecordService;

    public static class LocationLogRequest {
        public Double latitude;
        public Double longitude;
    }

    public static class CoordinateDto {
        public Double latitude;
        public Double longitude;
    }

    // 기록과 경로를 함께 저장하기 위한 DTO
    public static class RecordWithRouteRequest {
        public Long userId;
        public Long roomId;
        public Integer totalDistanceM;
        public Integer durationSeconds;
        public Integer avgPaceSeconds;
        public Double avgSpeedKmh;
        public String startedAt;
        public String endedAt;
        public java.util.List<CoordinateDto> route;
    }

    // 러닝 기록 저장
    @PostMapping
    public Mono<ResponseEntity<RunningRecord>> createRecord(@RequestBody RunningRecord record) {
        return runningRecordService.createRecord(record)
                .map(createdRecord -> ResponseEntity.status(HttpStatus.CREATED).body(createdRecord));
    }

    // 기록과 경로 좌표 함께 저장
    @PostMapping("/with-route")
    public Mono<ResponseEntity<RunningRecord>> createRecordWithRoute(@RequestBody RecordWithRouteRequest request) {
        RunningRecord record = new RunningRecord();
        record.setUserId(request.userId);
        record.setRoomId(request.roomId);
        record.setTotalDistanceM(request.totalDistanceM);
        record.setDurationSeconds(request.durationSeconds);
        record.setAvgPaceSeconds(request.avgPaceSeconds);
        record.setAvgSpeedKmh(request.avgSpeedKmh);
        record.setStartedAt(java.time.LocalDateTime.parse(request.startedAt));
        record.setEndedAt(java.time.LocalDateTime.parse(request.endedAt));

        java.util.List<CoordinateDto> routeCoords = request.route != null ? request.route : java.util.Collections.emptyList();

        return runningRecordService.createRecordWithRoute(record, routeCoords)
                .map(createdRecord -> ResponseEntity.status(HttpStatus.CREATED).body(createdRecord));
    }

    // 기록 상세 조회
    @GetMapping("/{recordId}")
    public Mono<ResponseEntity<RunningRecord>> getRecord(@PathVariable Long recordId) {
        return runningRecordService.findById(recordId)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    // 사용자별 전체 기록 조회 (최신순)
    @GetMapping("/user/{userId}")
    public Flux<RunningRecord> getUserRecords(@PathVariable Long userId) {
        return runningRecordService.findByUserId(userId);
    }

    // 주간 기록 조회
    @GetMapping("/user/{userId}/weekly")
    public Flux<RunningRecord> getWeeklyRecords(
            @PathVariable Long userId,
            @RequestParam String startDate
    ) {
        java.time.LocalDate start = java.time.LocalDate.parse(startDate);
        java.time.LocalDate end = start.plusDays(6);
        return runningRecordService.findByUserIdAndDateRange(userId, start, end);
    }

    // 월간 기록 조회
    @GetMapping("/user/{userId}/monthly")
    public Flux<RunningRecord> getMonthlyRecords(
            @PathVariable Long userId,
            @RequestParam int year,
            @RequestParam int month
    ) {
        java.time.LocalDate start = java.time.LocalDate.of(year, month, 1);
        java.time.LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
        return runningRecordService.findByUserIdAndDateRange(userId, start, end);
    }

    // 연간 기록 조회
    @GetMapping("/user/{userId}/yearly")
    public Flux<RunningRecord> getYearlyRecords(
            @PathVariable Long userId,
            @RequestParam int year
    ) {
        java.time.LocalDate start = java.time.LocalDate.of(year, 1, 1);
        java.time.LocalDate end = java.time.LocalDate.of(year, 12, 31);
        return runningRecordService.findByUserIdAndDateRange(userId, start, end);
    }

    // 같이 뛴 파트너 목록 조회
    @GetMapping("/{recordId}/partners")
    public Flux<User> getRunningPartners(@PathVariable Long recordId) {
        return runningRecordService.findRunningPartners(recordId);
    }

    // 실시간 위치 로그 추가
    @PostMapping("/{recordId}/location")
    public Mono<ResponseEntity<LocationLog>> addLocationLog(
            @PathVariable Long recordId,
            @RequestBody LocationLogRequest request
    ) {
        return runningRecordService.addLocationLog(recordId, request.latitude, request.longitude)
                .map(ResponseEntity::ok);
    }

    // 저장된 경로 좌표 목록 조회
    @GetMapping("/{recordId}/route")
    public Flux<LocationLog> getRoute(@PathVariable Long recordId) {
        return runningRecordService.getRoute(recordId);
    }

    // 기록 삭제
    @DeleteMapping("/{recordId}")
    public Mono<ResponseEntity<Void>> deleteRecord(@PathVariable Long recordId) {
        return runningRecordService.deleteRecord(recordId)
                .then(Mono.just(ResponseEntity.noContent().<Void>build()));
    }

    // 방 단위 전체 기록 조회
    @GetMapping("/room/{roomId}")
    public Flux<RunningRecord> getRoomRecords(@PathVariable Long roomId) {
        return runningRecordService.findByRoomId(roomId);
    }

    // 방 단위 주간 기록 조회
    @GetMapping("/room/{roomId}/weekly")
    public Flux<RunningRecord> getRoomWeeklyRecords(
            @PathVariable Long roomId,
            @RequestParam String startDate
    ) {
        java.time.LocalDate start = java.time.LocalDate.parse(startDate);
        java.time.LocalDate end = start.plusDays(6);
        return runningRecordService.findByRoomIdAndDateRange(roomId, start, end);
    }

    // 방 단위 월간 기록 조회
    @GetMapping("/room/{roomId}/monthly")
    public Flux<RunningRecord> getRoomMonthlyRecords(
            @PathVariable Long roomId,
            @RequestParam int year,
            @RequestParam int month
    ) {
        java.time.LocalDate start = java.time.LocalDate.of(year, month, 1);
        java.time.LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
        return runningRecordService.findByRoomIdAndDateRange(roomId, start, end);
    }

    // 방 단위 연간 기록 조회
    @GetMapping("/room/{roomId}/yearly")
    public Flux<RunningRecord> getRoomYearlyRecords(
            @PathVariable Long roomId,
            @RequestParam int year
    ) {
        java.time.LocalDate start = java.time.LocalDate.of(year, 1, 1);
        java.time.LocalDate end = java.time.LocalDate.of(year, 12, 31);
        return runningRecordService.findByRoomIdAndDateRange(roomId, start, end);
    }
}
