package com.running.app.running_app_backend.domain;

import lombok.Data;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;

// 방 참가자 정보
@Data
@Table("room_participants")
public class RoomParticipant {

    @Column("room_id")
    private Long roomId;

    @Column("user_id")
    private Long userId;

    @Column("joined_at")
    private LocalDateTime joinedAt;
}
