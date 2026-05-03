package com.running.app.running_app_backend.controller;

import com.running.app.running_app_backend.domain.User;
import com.running.app.running_app_backend.service.SocialAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

/**
 * 소셜 로그인(카카오, 네이버, 구글) 관련 인증 API
 * 로그인, 회원가입, 연동 해제 등을 처리함
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final SocialAccountService socialAccountService;
    private final com.running.app.running_app_backend.util.JwtUtil jwtUtil;

    /**
     * 소셜 로그인 요청 DTO
     * Native SDK에서 받은 토큰을 전달받음
     */
    public static class SocialLoginRequest {
        public String provider;    // naver, kakao 등
        public String accessToken; // SDK에서 발급받은 액세스 토큰
    }

    /**
     * 소셜 로그인 및 자동 회원가입
     * 기존 회원이면 로그인, 신규면 가입 후 토큰 반환
     */
    @PostMapping("/social/login")
    public Mono<ResponseEntity<com.running.app.running_app_backend.dto.AuthResponse>> socialLogin(@RequestBody SocialLoginRequest request) {
        
        // 현재는 네이버 로그인만 우선 지원
        if (!"naver".equals(request.provider)) {
            return Mono.error(new IllegalArgumentException("지원하지 않는 플랫폼입니다: " + request.provider));
        }

        return socialAccountService.loginWithNaverToken(request.accessToken)
            .map(user -> {
                String token = jwtUtil.generateToken(user.getUserId(), user.getEmail());
                return ResponseEntity.ok(
                    com.running.app.running_app_backend.dto.AuthResponse.builder()
                        .accessToken(token)
                        .user(user)
                        .build()
                );
            });
    }

    /**
     * 소셜 계정 연동 해제
     * 연동된 소셜 계정 레코드를 삭제함 (User 정보는 유지)
     */
    @DeleteMapping("/social/unlink")
    public Mono<ResponseEntity<Void>> unlinkSocialAccount(
            @RequestParam String provider,
            @RequestParam String providerUserId
    ) {
        return socialAccountService.unlinkSocialAccount(provider, providerUserId)
                .then(Mono.just(ResponseEntity.noContent().<Void>build()));
    }
}
