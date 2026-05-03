package com.running.app.running_app_backend.domain;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;

// 러닝 기록
@Data
@Table("running_records")
public class RunningRecord {

    @Id
    @Column("record_id")
    private Long recordId;

    @Column("user_id")
    private Long userId;

    // 방 ID (NULL이면 개인 러닝)
    @Column("room_id")
    private Long roomId;

    @Column("total_distance_m")
    private Integer totalDistanceM;

    @Column("duration_seconds")
    private Integer durationSeconds;

    @Column("avg_pace_seconds")
    private Integer avgPaceSeconds;

    @Column("avg_speed_kmh")
    private Double avgSpeedKmh;

    @Column("avg_heart_rate")
    private Integer avgHeartRate;

    @Column("calories")
    private Integer calories;

    @Column("started_at")
    private LocalDateTime startedAt;

    @Column("ended_at")
    private LocalDateTime endedAt;
}
