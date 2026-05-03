package com.running.app.running_app_backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.Map;

// 랭킹 서비스 로직
@Service
@RequiredArgsConstructor
public class RankingService {

    private final DatabaseClient databaseClient;

    // 일간 랭킹 조회 (상위 50명)
    public Flux<Map<String, Object>> getDailyRanking() {
        String sql = """
            SELECT
                u.user_id,
                u.nickname,
                COALESCE(SUM(r.total_distance_m), 0) as total_distance,
                COALESCE(SUM(r.duration_seconds), 0) as total_duration
            FROM users u
            LEFT JOIN running_records r ON u.user_id = r.user_id
                AND DATE(r.started_at) = CURRENT_DATE
            GROUP BY u.user_id, u.nickname
            HAVING COALESCE(SUM(r.total_distance_m), 0) > 0
            ORDER BY total_distance DESC, total_duration ASC
            LIMIT 50
            """;

        return executeRankingQuery(sql);
    }

    // 주간 랭킹 조회 (상위 50명)
    public Flux<Map<String, Object>> getWeeklyRanking() {
        String sql = """
            SELECT
                u.user_id,
                u.nickname,
                COALESCE(SUM(r.total_distance_m), 0) as total_distance,
                COALESCE(SUM(r.duration_seconds), 0) as total_duration
            FROM users u
            LEFT JOIN running_records r ON u.user_id = r.user_id
                AND r.started_at >= DATE_TRUNC('week', CURRENT_DATE)
            GROUP BY u.user_id, u.nickname
            HAVING COALESCE(SUM(r.total_distance_m), 0) > 0
            ORDER BY total_distance DESC, total_duration ASC
            LIMIT 50
            """;

        return executeRankingQuery(sql);
    }

    // 월간 랭킹 조회 (상위 50명)
    public Flux<Map<String, Object>> getMonthlyRanking() {
        String sql = """
            SELECT
                u.user_id,
                u.nickname,
                COALESCE(SUM(r.total_distance_m), 0) as total_distance,
                COALESCE(SUM(r.duration_seconds), 0) as total_duration
            FROM users u
            LEFT JOIN running_records r ON u.user_id = r.user_id
                AND r.started_at >= DATE_TRUNC('month', CURRENT_DATE)
            GROUP BY u.user_id, u.nickname
            HAVING COALESCE(SUM(r.total_distance_m), 0) > 0
            ORDER BY total_distance DESC, total_duration ASC
            LIMIT 50
            """;

        return executeRankingQuery(sql);
    }

    // 랭킹 쿼리 실행 및 결과 매핑
    private Flux<Map<String, Object>> executeRankingQuery(String sql) {
        return databaseClient.sql(sql)
                .fetch()
                .all()
                .map(row -> Map.of(
                        "userId", row.get("user_id"),
                        "nickname", row.get("nickname"),
                        "totalDistance", row.get("total_distance"),
                        "totalDuration", row.get("total_duration")
                ));
    }
}
