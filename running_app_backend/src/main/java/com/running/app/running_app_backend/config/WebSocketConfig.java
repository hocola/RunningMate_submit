package com.running.app.running_app_backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.HandlerMapping;
import org.springframework.web.reactive.handler.SimpleUrlHandlerMapping;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.server.support.WebSocketHandlerAdapter;
import org.springframework.web.cors.CorsConfiguration;
import com.running.app.running_app_backend.handler.LocationHandler;

import java.util.HashMap;
import java.util.Map;

// WebSocket 설정
@Configuration
public class WebSocketConfig {

    // 실시간 위치 처리를 위한 WebSocket 핸들러 등록
    @Bean
    public WebSocketHandler locationWebSocketHandler(LocationHandler locationHandler) {
        return locationHandler; 
    }

    // 경로 매핑 및 CORS 설정
    @Bean
    public HandlerMapping webSocketHandlerMapping(WebSocketHandler locationWebSocketHandler) {
        Map<String, WebSocketHandler> map = new HashMap<>();
        map.put("/ws/location", locationWebSocketHandler);

        SimpleUrlHandlerMapping handlerMapping = new SimpleUrlHandlerMapping();
        handlerMapping.setOrder(1);
        handlerMapping.setUrlMap(map);
        
        // 모든 출처 및 메서드 허용
        Map<String, CorsConfiguration> corsConfigurationMap = new HashMap<>();
        CorsConfiguration corsConfig = new CorsConfiguration().applyPermitDefaultValues();
        corsConfig.addAllowedOrigin("*");
        corsConfig.addAllowedMethod("*");
        corsConfigurationMap.put("/**", corsConfig);
        
        handlerMapping.setCorsConfigurations(corsConfigurationMap);

        return handlerMapping;
    }

    // WebFlux WebSocket 처리를 위한 어댑터
    @Bean
    public WebSocketHandlerAdapter handlerAdapter() {
        return new WebSocketHandlerAdapter();
    }
}
