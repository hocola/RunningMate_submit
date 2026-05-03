package com.running.app.running_app_backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.running.app.running_app_backend.domain.SocialAccount;
import com.running.app.running_app_backend.domain.User;
import com.running.app.running_app_backend.repository.SocialAccountRepository;
import com.running.app.running_app_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Slf4j
@Service
@RequiredArgsConstructor
public class SocialAccountService {

    private final SocialAccountRepository socialAccountRepository;
    private final UserRepository userRepository;
    
    // 비동기 HTTP 통신을 위한 WebClient
    private final WebClient webClient = WebClient.create();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 네이버 액세스 토큰으로 로그인 처리
    public Mono<User> loginWithNaverToken(String accessToken) {
        // 액세스 토큰으로 사용자 프로필 조회
        return getNaverUserProfile(accessToken)
            .flatMap(profile -> {
                // 로그인 및 회원가입 처리
                String providerId = profile.get("id").asText();
                String nickname = profile.has("nickname") ? profile.get("nickname").asText() : "Unknown";
                String email = profile.has("email") ? profile.get("email").asText() : "";
                
                return processLoginOrRegister("naver", providerId, nickname, email);
            });
    }

    // 네이버 프로필 정보 요청
    private Mono<JsonNode> getNaverUserProfile(String accessToken) {
        return webClient.get()
                .uri("https://openapi.naver.com/v1/nid/me")
                .header("Authorization", "Bearer " + accessToken)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(String.class)
                .map(response -> {
                    try {
                        JsonNode root = objectMapper.readTree(response);
                        return root.get("response"); // 네이버 응답의 response 필드에서 정보 추출
                    } catch (Exception e) {
                        throw new RuntimeException("Failed to parse Naver profile response", e);
                    }
                });
    }

    // 로그인 및 회원가입 로직
    private Mono<User> processLoginOrRegister(String provider, String providerUserId, String nickname, String email) {
        return socialAccountRepository.findByProviderAndProviderUserId(provider, providerUserId)
                .flatMap(existing -> userRepository.findById(existing.getUserId()))
                .switchIfEmpty(
                    createNewUserWithSocialAccount(provider, providerUserId, nickname, email)
                );
    }

    private Mono<User> createNewUserWithSocialAccount(String provider, String providerUserId, String nickname, String email) {
        User newUser = new User();
        newUser.setNickname(nickname);
        newUser.setEmail(email);

        return userRepository.save(newUser)
                .flatMap(savedUser -> {
                    SocialAccount socialAccount = new SocialAccount();
                    socialAccount.setProvider(provider);
                    socialAccount.setProviderUserId(providerUserId);
                    socialAccount.setUserId(savedUser.getUserId());
                    return socialAccountRepository.save(socialAccount)
                            .thenReturn(savedUser);
                });
    }

    public Mono<SocialAccount> findByProviderAndProviderUserId(String provider, String providerUserId) {
        return socialAccountRepository.findByProviderAndProviderUserId(provider, providerUserId);
    }

    public Flux<SocialAccount> findByUserId(Long userId) {
        return socialAccountRepository.findByUserId(userId);
    }

    public Mono<Void> unlinkSocialAccount(String provider, String providerUserId) {
        return socialAccountRepository.deleteByProviderAndProviderUserId(provider, providerUserId);
    }
}
