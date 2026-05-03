package com.running.app.running_app_backend.domain;

import lombok.Data;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;

// 소셜 계정 연동 정보
@Data
@Table("social_accounts")
public class SocialAccount {

    @Column("provider")
    private String provider;

    @Column("provider_user_id")
    private String providerUserId;

    @Column("user_id")
    private Long userId;

    @Column("connected_at")
    private LocalDateTime connectedAt;
}
