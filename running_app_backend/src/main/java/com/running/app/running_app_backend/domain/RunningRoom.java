package com.running.app.running_app_backend.domain;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;

// 러닝 방 정보
@Data
@Table("running_rooms")
public class RunningRoom {

    @Id
    @Column("room_id")
    private Long roomId;

    @Column("host_user_id")
    private Long hostUserId;

    @Column("room_name")
    private String roomName;

    @Column("room_password")
    private String roomPassword;

    @Column("max_participants")
    private Integer maxParticipants;

    @Column("description")
    private String description;

    @Column("created_at")
    private LocalDateTime createdAt;

    @Column("is_deleted")
    private Boolean isDeleted;
}
