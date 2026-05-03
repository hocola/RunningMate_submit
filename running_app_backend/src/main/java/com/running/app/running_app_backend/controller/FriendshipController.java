package com.running.app.running_app_backend.controller;

import com.running.app.running_app_backend.domain.Friendship;
import com.running.app.running_app_backend.domain.User;
import com.running.app.running_app_backend.service.FriendshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

// 친구 관계 관리 API
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/friendships")
public class FriendshipController {

    private final FriendshipService friendshipService;

    public static class FriendRequest {
        public Long requesterId;
        public Long receiverId;
    }

    // 친구 신청
    @PostMapping("/request")
    public Mono<ResponseEntity<Friendship>> sendFriendRequest(@RequestBody FriendRequest request) {
        return friendshipService.sendFriendRequest(request.requesterId, request.receiverId)
                .map(friendship -> ResponseEntity.status(HttpStatus.CREATED).body(friendship));
    }

    // 신청 수락
    @PostMapping("/accept")
    public Mono<ResponseEntity<Void>> acceptFriendRequest(@RequestBody FriendRequest request) {
        return friendshipService.acceptFriendRequest(request.requesterId, request.receiverId)
                .then(Mono.just(ResponseEntity.ok().<Void>build()));
    }

    // 신청 거절
    @PostMapping("/reject")
    public Mono<ResponseEntity<Void>> rejectFriendRequest(@RequestBody FriendRequest request) {
        return friendshipService.rejectFriendRequest(request.requesterId, request.receiverId)
                .then(Mono.just(ResponseEntity.ok().<Void>build()));
    }

    // 대기 중인 신청 목록
    @GetMapping("/pending/{userId}")
    public Flux<Friendship> getPendingRequests(@PathVariable Long userId) {
        return friendshipService.getPendingRequests(userId);
    }

    // 내 친구 목록
    @GetMapping("/{userId}")
    public Flux<User> getFriends(@PathVariable Long userId) {
        return friendshipService.getFriends(userId);
    }

    // 친구 삭제
    @DeleteMapping
    public Mono<ResponseEntity<String>> deleteFriendship(
            @RequestParam Long userId1,
            @RequestParam Long userId2
    ) {
        return friendshipService.deleteFriendship(userId1, userId2)
                .then(Mono.just(ResponseEntity.ok("deleted")));
    }
}
