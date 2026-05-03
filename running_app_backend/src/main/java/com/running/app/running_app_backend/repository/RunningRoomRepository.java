package com.running.app.running_app_backend.repository;

import com.running.app.running_app_backend.domain.RunningRoom;
import org.springframework.data.r2dbc.repository.Modifying;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

// 러닝방 리포지토리
public interface RunningRoomRepository extends ReactiveCrudRepository<RunningRoom, Long> {

    // 활성화된 방 목록 조회
    @Query("SELECT * FROM running_rooms WHERE is_deleted = false")
    Flux<RunningRoom> findActiveRooms();

    // 특정 방장의 활성화된 방 목록 조회
    @Query("SELECT * FROM running_rooms WHERE host_user_id = :hostUserId AND is_deleted = false")
    Flux<RunningRoom> findActiveRoomsByHostUserId(Long hostUserId);

    // 방 종료 처리
    @Modifying
    @Query("UPDATE running_rooms SET is_deleted = true WHERE room_id = :roomId")
    Mono<Void> softDeleteById(Long roomId);

    // 사용자가 참여 중인 활성 방 조회
    @Query("SELECT r.* FROM running_rooms r " +
           "INNER JOIN room_participants p ON r.room_id = p.room_id " +
           "WHERE p.user_id = :userId AND r.is_deleted = false")
    Flux<RunningRoom> findRoomsByUserId(Long userId);
}
