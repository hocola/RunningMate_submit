package com.running.app.running_app_backend.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.Disposable;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

// 실시간 위치 공유를 위한 WebSocket 핸들러
// Redis Pub/Sub을 사용해 방 단위로 위치 정보를 브로드캐스트함
@Component
@Slf4j
public class LocationHandler implements WebSocketHandler {

    private final ReactiveStringRedisTemplate redis;
    private final ObjectMapper om = new ObjectMapper();

    // 방별 활성 세션 관리
    private final Map<String, Set<WebSocketSession>> roomSessions = new ConcurrentHashMap<>();
    
    // 방별 Redis 구독 관리
    private final Map<String, Disposable> roomSubscriptions = new ConcurrentHashMap<>();

    // 세션별 사용자 정보 매핑
    private final Map<String, Map<String, String>> sessionUserMap = new ConcurrentHashMap<>();

    public LocationHandler(ReactiveStringRedisTemplate redis) {
        this.redis = redis;
    }

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        // 수신 메시지 처리
        Mono<Void> inbound = session.receive()
                .map(WebSocketMessage::getPayloadAsText)
                .doOnSubscribe(s -> log.info("[WS {}] OPEN", session.getId()))
                .doOnNext(txt -> log.info("[WS {}] IN  : {}", session.getId(), txt))
                .flatMap(payload -> {
                    try {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> m = om.readValue(payload, Map.class);
                        String type = String.valueOf(m.get("type"));
                        String roomId = String.valueOf(m.get("roomId"));

                        if ("join".equals(type)) {
                            // 방 입장 처리
                            String userId = String.valueOf(m.get("userId"));
                            roomSessions.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(session);

                            // 세션 정보 저장
                            Map<String, String> sessionInfo = new HashMap<>();
                            sessionInfo.put("roomId", roomId);
                            sessionInfo.put("userId", userId);
                            sessionUserMap.put(session.getId(), sessionInfo);

                            log.info("[WS {}] JOIN  room={} user={}", session.getId(), roomId, userId);

                            // 해당 방의 Redis 채널 구독
                            roomSubscriptions.computeIfAbsent(roomId, rid -> {
                                log.info("[SUB] listen room:{}", rid);
                                return redis.listenToChannel("room:" + rid)
                                        .map(msg -> msg.getMessage())
                                        .flatMap(payloadFromRedis ->
                                                Flux.fromIterable(roomSessions.getOrDefault(rid, Set.of()))
                                                    .flatMap(s -> safeSend(s, payloadFromRedis))
                                        )
                                        .subscribe();
                            });

                            return safeSend(session, "{\"type\":\"joined\",\"roomId\":\"" + roomId + "\"}");
                        }
                        else if ("leave".equals(type)) {
                            // 방 퇴장 처리
                            String userId = String.valueOf(m.get("userId"));
                            Set<WebSocketSession> set = roomSessions.get(roomId);
                            if (set != null) {
                                set.remove(session);
                                if (set.isEmpty()) {
                                    roomSessions.remove(roomId);
                                    Disposable sub = roomSubscriptions.remove(roomId);
                                    if (sub != null) sub.dispose();
                                }
                            }
                            sessionUserMap.remove(session.getId());

                            log.info("[WS {}] LEAVE room={}", session.getId(), roomId);

                            // 퇴장 알림 브로드캐스트
                            String leftMsg = "{\"type\":\"left\",\"roomId\":\"" + roomId + "\",\"userId\":\"" + userId + "\"}";
                            return redis.convertAndSend("room:" + roomId, leftMsg).then();
                        }
                        else if ("loc".equals(type)) {
                            // 실시간 위치 정보 브로드캐스트
                            log.debug("[WS {}] LOC  publish room={} {}", session.getId(), roomId, payload);
                            return redis.convertAndSend("room:" + roomId, payload).then();
                        }
                        return Mono.empty();
                    } catch (Exception e) {
                        log.warn("[WS {}] JSON parse error: {}", session.getId(), e.toString());
                        return Mono.empty();
                    }
                })
                .then();

        // 연결 초기 메시지 전송
        Mono<Void> hello = session.send(Mono.just(session.textMessage("{\"type\":\"hello\"}")))
                                  .doOnSubscribe(s -> log.debug("[WS {}] OUT : hello", session.getId()));

        // 세션 종료 시 정리
        return Mono.when(hello, inbound)
                .doFinally(sig -> {
                    Map<String, String> sessionInfo = sessionUserMap.remove(session.getId());
                    if (sessionInfo != null) {
                        String closedRoomId = sessionInfo.get("roomId");
                        String closedUserId = sessionInfo.get("userId");

                        String leftMsg = "{\"type\":\"left\",\"roomId\":\"" + closedRoomId + "\",\"userId\":\"" + closedUserId + "\"}";
                        redis.convertAndSend("room:" + closedRoomId, leftMsg).subscribe();

                        log.info("[WS {}] FORCE-LEAVE room={} user={}", session.getId(), closedRoomId, closedUserId);
                    }

                    roomSessions.forEach((roomId, set) -> {
                        if (set.remove(session) && set.isEmpty()) {
                            roomSessions.remove(roomId);
                            Disposable sub = roomSubscriptions.remove(roomId);
                            if (sub != null) sub.dispose();
                        }
                    });

                    log.info("[WS {}] CLOSED ({})", session.getId(), sig);
                });
    }

    // 메시지 안전 전송
    private Mono<Void> safeSend(WebSocketSession s, String payload) {
        if (!s.isOpen()) return Mono.empty();
        return s.send(Mono.just(s.textMessage(payload)))
                .doOnError(ex -> log.warn("[WS {}] send error: {}", s.getId(), ex.toString()))
                .onErrorResume(ex -> Mono.empty());
    }
}
