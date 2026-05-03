package com.running.app.running_app_backend.domain;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;

// 사용자 정보
@Data
@Table("users")
public class User {

    @Id
    @Column("user_id")
    private Long userId;

    @Column("nickname")
    private String nickname;

    @Column("email")
    private String email;

    @Column("created_at")
    private LocalDateTime createdAt;
}
