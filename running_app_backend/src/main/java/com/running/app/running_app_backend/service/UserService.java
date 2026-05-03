package com.running.app.running_app_backend.service;

import com.running.app.running_app_backend.domain.User;
import com.running.app.running_app_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * 사용자 관련 비즈니스 로직을 처리하는 서비스 계층
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    /**
     * 새로운 사용자 저장
     */
    public Mono<User> createUser(User user) {
        return userRepository.save(user);
    }

    /**
     * ID로 사용자 검색
     */
    public Mono<User> findById(Long userId) {
        return userRepository.findById(userId);
    }

    /**
     * 이메일로 사용자 조회
     */
    public Mono<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    /**
     * 닉네임으로 사용자 조회
     */
    public Mono<User> findByNickname(String nickname) {
        return userRepository.findByNickname(nickname);
    }

    /**
     * 전체 사용자 목록 조회
     */
    public Flux<User> findAll() {
        return userRepository.findAll();
    }

    /**
     * 사용자 정보 업데이트
     */
    public Mono<User> updateUser(User user) {
        return userRepository.save(user);
    }

    /**
     * 사용자 삭제
     */
    public Mono<Void> deleteById(Long userId) {
        return userRepository.deleteById(userId);
    }

    /**
     * 닉네임 부분 일치 검색
     */
    public Flux<User> searchByNickname(String keyword) {
        return userRepository.searchByNickname(keyword);
    }
}
