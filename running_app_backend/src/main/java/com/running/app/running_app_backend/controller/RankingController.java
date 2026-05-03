package com.running.app.running_app_backend.controller;

import com.running.app.running_app_backend.service.RankingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.Map;

// 랭킹 조회 API
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ranking")
public class RankingController {

    private final RankingService rankingService;

    // 일간 랭킹
    @GetMapping("/daily")
    public Flux<Map<String, Object>> getDailyRanking() {
        return rankingService.getDailyRanking();
    }

    // 주간 랭킹
    @GetMapping("/weekly")
    public Flux<Map<String, Object>> getWeeklyRanking() {
        return rankingService.getWeeklyRanking();
    }

    // 월간 랭킹
    @GetMapping("/monthly")
    public Flux<Map<String, Object>> getMonthlyRanking() {
        return rankingService.getMonthlyRanking();
    }
}
