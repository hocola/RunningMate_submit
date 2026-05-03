package com.running.app.running_app_backend.repository;

import com.running.app.running_app_backend.domain.Friendship;
import org.springframework.data.r2dbc.repository.Modifying;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

// 친구 관계 데이터 접근 리포지토리
public interface FriendshipRepository extends ReactiveCrudRepository<Friendship, Void> {

    // 특정 친구 관계 정보 조회
    @Query("SELECT * FROM friendships WHERE requester_id = :requesterId AND receiver_id = :receiverId")
    Mono<Friendship> findByRequesterIdAndReceiverId(Long requesterId, Long receiverId);

    // 내가 보낸 친구 신청 목록
    Flux<Friendship> findByRequesterId(Long requesterId);

    // 내가 받은 친구 신청 목록
    Flux<Friendship> findByReceiverId(Long receiverId);

    // 대기 중인 친구 신청 목록
    @Query("SELECT * FROM friendships WHERE receiver_id = :receiverId AND status = 'pending'")
    Flux<Friendship> findPendingRequestsByReceiverId(Long receiverId);

    // 수락된 친구 목록 조회
    @Query("SELECT * FROM friendships WHERE (requester_id = :userId OR receiver_id = :userId) AND status = 'accepted'")
    Flux<Friendship> findAcceptedFriendships(Long userId);

    // 친구 신청 상태 변경
    @Modifying
    @Query("UPDATE friendships SET status = :status WHERE requester_id = :requesterId AND receiver_id = :receiverId")
    Mono<Void> updateStatus(Long requesterId, Long receiverId, String status);

    // 친구 관계 데이터 삭제
    @Query("DELETE FROM friendships WHERE requester_id = :requesterId AND receiver_id = :receiverId")
    Mono<Void> deleteByRequesterIdAndReceiverId(Long requesterId, Long receiverId);
}
