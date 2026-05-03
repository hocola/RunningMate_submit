package com.running.app.running_app_backend.repository;

import com.running.app.running_app_backend.domain.SocialAccount;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

// 소셜 계정 리포지토리
public interface SocialAccountRepository extends ReactiveCrudRepository<SocialAccount, Void> {

    // 소셜 제공자 정보로 계정 조회
    @Query("SELECT * FROM social_accounts WHERE provider = :provider AND provider_user_id = :providerUserId")
    Mono<SocialAccount> findByProviderAndProviderUserId(String provider, String providerUserId);

    // 사용자의 연동된 소셜 계정 목록 조회
    Flux<SocialAccount> findByUserId(Long userId);

    // 소셜 연동 해제
    @Query("DELETE FROM social_accounts WHERE provider = :provider AND provider_user_id = :providerUserId")
    Mono<Void> deleteByProviderAndProviderUserId(String provider, String providerUserId);
}
