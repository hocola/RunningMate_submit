package com.running.app.running_app_backend.domain;

import lombok.Data;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

// 친구 관계
@Data
@Table("friendships")
public class Friendship {

    @Column("requester_id")
    private Long requesterId;

    @Column("receiver_id")
    private Long receiverId;

    // 상태: pending, accepted, rejected
    @Column("status")
    private String status;
}
