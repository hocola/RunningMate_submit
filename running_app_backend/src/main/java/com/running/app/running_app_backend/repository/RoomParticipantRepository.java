package com.running.app.running_app_backend.repository;

import com.running.app.running_app_backend.domain.RoomParticipant;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

// 방 참가자 리포지토리
public interface RoomParticipantRepository extends ReactiveCrudRepository<RoomParticipant, Void> {

    // 특정 방의 사용자 참가 정보 조회
    @Query("SELECT * FROM room_participants WHERE room_id = :roomId AND user_id = :userId")
    Mono<RoomParticipant> findByRoomIdAndUserId(Long roomId, Long userId);

    // 방 참가자 목록 조회
    Flux<RoomParticipant> findByRoomId(Long roomId);

    // 사용자가 참여 중인 방 정보 조회
    Flux<RoomParticipant> findByUserId(Long userId);

    // 현재 참가자 수 조회
    @Query("SELECT COUNT(*) FROM room_participants WHERE room_id = :roomId")
    Mono<Long> countByRoomId(Long roomId);

    // 방 퇴장 처리
    @Query("DELETE FROM room_participants WHERE room_id = :roomId AND user_id = :userId")
    Mono<Void> deleteByRoomIdAndUserId(Long roomId, Long userId);
}
