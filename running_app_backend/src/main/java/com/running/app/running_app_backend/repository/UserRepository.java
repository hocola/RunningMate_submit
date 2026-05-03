package com.running.app.running_app_backend.repository;

import com.running.app.running_app_backend.domain.User;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

// 사용자 리포지토리
public interface UserRepository extends ReactiveCrudRepository<User, Long> {

    // 이메일로 사용자 조회
    Mono<User> findByEmail(String email);

    // 닉네임으로 사용자 조회
    Mono<User> findByNickname(String nickname);

    // 닉네임 검색 (부분 일치)
    @Query("SELECT * FROM users WHERE nickname ILIKE '%' || :keyword || '%' LIMIT 20")
    Flux<User> searchByNickname(String keyword);
}
