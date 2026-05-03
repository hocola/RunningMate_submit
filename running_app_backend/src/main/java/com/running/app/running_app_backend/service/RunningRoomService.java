package com.running.app.running_app_backend.service;

import com.running.app.running_app_backend.domain.RoomParticipant;
import com.running.app.running_app_backend.domain.RunningRoom;
import com.running.app.running_app_backend.repository.RoomParticipantRepository;
import com.running.app.running_app_backend.repository.RunningRoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

// 러닝방 서비스 로직
@Service
@RequiredArgsConstructor
public class RunningRoomService {

    private final RunningRoomRepository runningRoomRepository;
    private final RoomParticipantRepository roomParticipantRepository;

    // 새로운 방 생성
    public Mono<RunningRoom> createRoom(RunningRoom room) {
        room.setIsDeleted(false);
        return runningRoomRepository.save(room)
                .flatMap(savedRoom -> {
                    // 방장을 참가자로 등록
                    RoomParticipant host = new RoomParticipant();
                    host.setRoomId(savedRoom.getRoomId());
                    host.setUserId(savedRoom.getHostUserId());
                    return roomParticipantRepository.save(host)
                            .thenReturn(savedRoom);
                });
    }

    // 방 상세 정보 조회
    public Mono<RunningRoom> findById(Long roomId) {
        return runningRoomRepository.findById(roomId);
    }

    // 활성 상태의 방 목록 조회
    public Flux<RunningRoom> findActiveRooms() {
        return runningRoomRepository.findActiveRooms();
    }

    // 조건 확인 후 방 입장 처리
    public Mono<RoomParticipant> joinRoom(Long roomId, Long userId, String password) {
        return runningRoomRepository.findById(roomId)
                .flatMap(room -> {
                    if (room.getIsDeleted()) {
                        return Mono.error(new RuntimeException("존재하지 않는 방입니다."));
                    }

                    if (room.getRoomPassword() != null && !room.getRoomPassword().equals(password)) {
                        return Mono.error(new RuntimeException("비밀번호가 일치하지 않습니다."));
                    }

                    return roomParticipantRepository.findByRoomIdAndUserId(roomId, userId)
                            .flatMap(existing -> {
                                return Mono.just(existing);
                            })
                            .switchIfEmpty(
                                // 정원 확인 후 참가자 추가
                                roomParticipantRepository.countByRoomId(roomId)
                                    .flatMap(count -> {
                                        if (count >= room.getMaxParticipants()) {
                                            return Mono.error(new RuntimeException("방 정원이 초과되었습니다."));
                                        }

                                        RoomParticipant participant = new RoomParticipant();
                                        participant.setRoomId(roomId);
                                        participant.setUserId(userId);
                                        return roomParticipantRepository.save(participant);
                                    })
                            );
                });
    }

    // 방 퇴장 처리
    public Mono<Void> leaveRoom(Long roomId, Long userId) {
        return runningRoomRepository.findById(roomId)
                .flatMap(room -> {
                    // 방장이 퇴장할 경우 방 종료 처리
                    if (room.getHostUserId().equals(userId)) {
                        return runningRoomRepository.softDeleteById(roomId);
                    }
                    // 일반 참가자는 참가 정보만 삭제
                    return roomParticipantRepository.deleteByRoomIdAndUserId(roomId, userId);
                });
    }

    // 참가자 목록 조회
    public Flux<RoomParticipant> getParticipants(Long roomId) {
        return roomParticipantRepository.findByRoomId(roomId);
    }

    // 현재 참가자 수 확인
    public Mono<Long> getParticipantCount(Long roomId) {
        return roomParticipantRepository.countByRoomId(roomId);
    }

    // 사용자가 참여 중인 방 목록 조회
    public Flux<RunningRoom> findMyRooms(Long userId) {
        return runningRoomRepository.findRoomsByUserId(userId);
    }
}
