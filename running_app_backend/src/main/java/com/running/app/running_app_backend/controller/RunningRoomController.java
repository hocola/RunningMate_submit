package com.running.app.running_app_backend.controller;

import com.running.app.running_app_backend.domain.RoomParticipant;
import com.running.app.running_app_backend.domain.RunningRoom;
import com.running.app.running_app_backend.service.RunningRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

// 러닝 방 관리 API
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/rooms")
public class RunningRoomController {

    private final RunningRoomService runningRoomService;

    // 방 입장 DTO
    public static class JoinRoomRequest {
        public Long userId;
        public String password;
    }

    // 새로운 방 생성
    @PostMapping
    public Mono<ResponseEntity<RunningRoom>> createRoom(@RequestBody RunningRoom room) {
        return runningRoomService.createRoom(room)
                .map(createdRoom -> ResponseEntity.status(HttpStatus.CREATED).body(createdRoom));
    }

    // 방 정보 조회
    @GetMapping("/{roomId}")
    public Mono<ResponseEntity<RunningRoom>> getRoom(@PathVariable Long roomId) {
        return runningRoomService.findById(roomId)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    // 활성화된 전체 방 목록
    @GetMapping
    public Flux<RunningRoom> getActiveRooms() {
        return runningRoomService.findActiveRooms();
    }

    // 내가 참여 중인 방 목록
    @GetMapping("/my/{userId}")
    public Flux<RunningRoom> getMyRooms(@PathVariable Long userId) {
        return runningRoomService.findMyRooms(userId);
    }

    // 방 입장 처리
    @PostMapping("/{roomId}/join")
    public Mono<ResponseEntity<Object>> joinRoom(
            @PathVariable Long roomId,
            @RequestBody JoinRoomRequest request
    ) {
        return runningRoomService.joinRoom(roomId, request.userId, request.password)
                .<ResponseEntity<Object>>map(participant -> ResponseEntity.ok(participant))
                .onErrorResume(e -> {
                    java.util.Map<String, String> errorResponse = new java.util.HashMap<>();
                    errorResponse.put("message", e.getMessage());
                    return Mono.just(ResponseEntity.badRequest().body(errorResponse));
                });
    }

    // 방 퇴장 처리
    @PostMapping("/{roomId}/leave")
    public Mono<ResponseEntity<Void>> leaveRoom(
            @PathVariable Long roomId,
            @RequestParam Long userId
    ) {
        return runningRoomService.leaveRoom(roomId, userId)
                .then(Mono.just(ResponseEntity.ok().<Void>build()));
    }

    // 참가자 목록 조회
    @GetMapping("/{roomId}/participants")
    public Flux<RoomParticipant> getParticipants(@PathVariable Long roomId) {
        return runningRoomService.getParticipants(roomId);
    }

    // 참가자 수 조회
    @GetMapping("/{roomId}/count")
    public Mono<Long> getParticipantCount(@PathVariable Long roomId) {
        return runningRoomService.getParticipantCount(roomId);
    }
}
