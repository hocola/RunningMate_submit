package com.running.app.running_app_backend.domain;

import lombok.Data;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

// 위치 기록(GPS 경로)
@Data
@Table("location_logs")
public class LocationLog {

    @Column("record_id")
    private Long recordId;

    // 경로 순서
    @Column("seq")
    private Integer seq;

    @Column("latitude")
    private Double latitude;

    @Column("longitude")
    private Double longitude;
}
