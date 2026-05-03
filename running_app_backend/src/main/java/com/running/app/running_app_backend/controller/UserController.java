package com.running.app.running_app_backend.controller;

import com.running.app.running_app_backend.domain.User;
import com.running.app.running_app_backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

// 사용자 관련 API
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    // 사용자 정보 조회
    @GetMapping("/{userId}")
    public Mono<ResponseEntity<User>> getUser(@PathVariable Long userId) {
        return userService.findById(userId)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    // 전체 사용자 목록
    @GetMapping
    public Flux<User> getAllUsers() {
        return userService.findAll();
    }

    // 닉네임 검색
    @GetMapping("/search")
    public Flux<User> searchUsers(@RequestParam String nickname) {
        return userService.searchByNickname(nickname);
    }

    // 닉네임 중복 확인
    @GetMapping("/check-nickname")
    public Mono<ResponseEntity<java.util.Map<String, Boolean>>> checkNickname(@RequestParam String nickname) {
        return userService.findByNickname(nickname)
                .map(user -> ResponseEntity.ok(java.util.Map.of("available", false)))
                .defaultIfEmpty(ResponseEntity.ok(java.util.Map.of("available", true)));
    }

    // 닉네임 변경
    @PatchMapping("/{userId}/nickname")
    public Mono<ResponseEntity<User>> updateNickname(
            @PathVariable Long userId,
            @RequestBody java.util.Map<String, String> request
    ) {
        String newNickname = request.get("nickname");
        if (newNickname == null || newNickname.trim().isEmpty()) {
            return Mono.just(ResponseEntity.badRequest().build());
        }

        return userService.findByNickname(newNickname.trim())
                .flatMap(existing -> {
                    if (existing.getUserId().equals(userId)) {
                        return userService.findById(userId)
                                .map(ResponseEntity::ok);
                    }
                    return Mono.just(ResponseEntity.status(HttpStatus.CONFLICT).<User>build());
                })
                .switchIfEmpty(
                    userService.findById(userId)
                        .flatMap(user -> {
                            user.setNickname(newNickname.trim());
                            return userService.updateUser(user);
                        })
                        .map(ResponseEntity::ok)
                        .defaultIfEmpty(ResponseEntity.notFound().build())
                );
    }

    // 사용자 생성
    @PostMapping
    public Mono<ResponseEntity<User>> createUser(@RequestBody User user) {
        return userService.createUser(user)
                .map(savedUser -> ResponseEntity.status(HttpStatus.CREATED).body(savedUser));
    }

    // 사용자 정보 수정
    @PutMapping("/{userId}")
    public Mono<ResponseEntity<User>> updateUser(@PathVariable Long userId, @RequestBody User user) {
        return userService.findById(userId)
                .flatMap(existingUser -> {
                    existingUser.setNickname(user.getNickname());
                    existingUser.setEmail(user.getEmail());
                    return userService.updateUser(existingUser);
                })
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    // 계정 삭제
    @DeleteMapping("/{userId}")
    public Mono<ResponseEntity<String>> deleteUser(@PathVariable Long userId) {
        return userService.findById(userId)
                .flatMap(user -> userService.deleteById(userId)
                        .then(Mono.just(ResponseEntity.ok("deleted"))))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }
}
