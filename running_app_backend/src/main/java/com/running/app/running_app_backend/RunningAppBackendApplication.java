package com.running.app.running_app_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

// RunningMate 백엔드 애플리케이션 메인 클래스
@SpringBootApplication
@ComponentScan(basePackages = {"com.running.app", "com.running.app.running_app_backend"})
public class RunningAppBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(RunningAppBackendApplication.class, args);
	}

}
