/**
 * 서버 설정
 *
 * 환경에 따라 SERVER_IP를 변경하세요:
 * - 노트북 + 휴대폰: '192.168.1.2'
 * - 컴퓨터 + 에뮬레이터: '10.0.2.2' (localhost)
 */ 

//  .env 파일에서 관리하는 것을 권장합니다.
// 기본값으로 기존 IP를 유지하되, 필요시 환경변수로 대체 가능하도록 구성합니다.
const SERVER_IP = process.env.SERVER_IP || '127.0.0.1';
const SERVER_PORT = process.env.SERVER_PORT || '8080';

// API & WebSocket URLs
export const API_BASE_URL = `http://${SERVER_IP}:${SERVER_PORT}/api`;
export const WS_BASE_URL = `ws://${SERVER_IP}:${SERVER_PORT}/ws/location`;

export default {
  SERVER_IP,
  SERVER_PORT,
  API_BASE_URL,
  WS_BASE_URL,
};  

console.log('API_BASE_URL =', API_BASE_URL);
console.log('WS_BASE_URL =', WS_BASE_URL);
