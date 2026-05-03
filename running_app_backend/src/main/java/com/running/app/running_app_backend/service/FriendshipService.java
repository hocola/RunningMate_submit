package com.running.app.running_app_backend.service;

import com.running.app.running_app_backend.domain.Friendship;
import com.running.app.running_app_backend.domain.User;
import com.running.app.running_app_backend.repository.FriendshipRepository;
import com.running.app.running_app_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

// 친구 관계 서비스 로직
@Service
@RequiredArgsConstructor
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;

    // 친구 신청
    public Mono<Friendship> sendFriendRequest(Long requesterId, Long receiverId) {
        Friendship friendship = new Friendship();
        friendship.setRequesterId(requesterId);
        friendship.setReceiverId(receiverId);
        friendship.setStatus("pending");
        return friendshipRepository.save(friendship);
    }

    // 친구 신청 수락
    public Mono<Void> acceptFriendRequest(Long requesterId, Long receiverId) {
        return friendshipRepository.updateStatus(requesterId, receiverId, "accepted");
    }

    // 친구 신청 거절
    public Mono<Void> rejectFriendRequest(Long requesterId, Long receiverId) {
        return friendshipRepository.updateStatus(requesterId, receiverId, "rejected");
    }

    // 대기 중인 친구 신청 목록 조회
    public Flux<Friendship> getPendingRequests(Long receiverId) {
        return friendshipRepository.findPendingRequestsByReceiverId(receiverId);
    }

    // 친구 목록 조회
    public Flux<User> getFriends(Long userId) {
        return friendshipRepository.findAcceptedFriendships(userId)
                .flatMap(friendship -> {
                    // 사용자 본인을 제외한 상대방 정보 추출
                    Long friendId = friendship.getRequesterId().equals(userId)
                            ? friendship.getReceiverId()
                            : friendship.getRequesterId();
                    return userRepository.findById(friendId);
                });
    }

    // 친구 관계 삭제
    public Mono<Void> deleteFriendship(Long userId1, Long userId2) {
        // 양방향 관계를 모두 고려하여 삭제 처리
        return friendshipRepository.deleteByRequesterIdAndReceiverId(userId1, userId2)
                .then(friendshipRepository.deleteByRequesterIdAndReceiverId(userId2, userId1));
    }
}
