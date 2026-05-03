package com.running.app.running_app_backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.time.Duration;

// Redis 테스트용 컨트롤러
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/redis")
public class RedisTestController {

    private final ReactiveStringRedisTemplate redis;

    // Redis 연결 확인 (SET/GET 테스트)
    @GetMapping("/ping") 
    public Mono<String> ping() {
        String key = "__ping__";
        return redis.opsForValue()
                .set(key, "PONG", Duration.ofSeconds(5))
                .flatMap(ok -> ok ? redis.opsForValue().get(key)
                                  : Mono.error(new IllegalStateException("Redis SET failed")));
    }

    // Redis 데이터 저장
    @PostMapping("/set")
    public Mono<Boolean> set(
            @RequestParam String key,
            @RequestParam String value,
            @RequestParam(name = "ttl", defaultValue = "60") long ttlSeconds
    ) {
        return redis.opsForValue().set(key, value, Duration.ofSeconds(ttlSeconds));
    }

    // Redis 데이터 조회
    @GetMapping("/get")
    public Mono<String> get(@RequestParam String key) {
        return redis.opsForValue().get(key);
    }

    // Redis Pub/Sub 테스트
    @PostMapping("/pub")
    public Mono<Long> publish(@RequestParam String channel, @RequestParam String msg) {
        return redis.convertAndSend(channel, msg);
    }
}
