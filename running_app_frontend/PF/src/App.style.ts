import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // 로딩 화면 스타일
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },

  // 메인 화면 스타일
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },

  // App.tsx 관련 추가 스타일
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#4285F4',
    marginBottom: -5,
  },
  markerDot: {
    width: 16,
    height: 16,
    backgroundColor: '#4285F4',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: 'white',
  },
  debugTextBox: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },

  // 메인 컨텐츠
  mainContent: {
    flex: 1,
    position: 'relative',
  },

  // 버튼 위치
  myLocationButton: {
    position: 'absolute',
    top: 360,   
    right: 20,
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },

  // 화면 중앙 텍스트
  motivationText: {
    position: 'absolute',
    top: '60%',
    alignSelf: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000ff',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowRadius: 5,
    zIndex: 1,
  },

  // 하단 패널
  bottomPanel: {
    position: 'absolute',
    bottom: 40, 
    width: '85%',
    alignSelf: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconButton: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 14,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 20,
  },
  startButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },

  // 하단 탭 바
  tabBar: {
    height: 100,     
    paddingBottom: 30,
    paddingTop: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  // 기타 화면
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  screenDescription: {
    fontSize: 16,
    color: '#666',
  },

  // 목표 설정 팝업 스타일
  goalModal: {
    position: 'absolute',
    bottom: 20,
    left: '5%',
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingVertical: 30,
    paddingHorizontal: 20,
    elevation: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  
  // 탭 (거리 목표 / 시간 목표)
  tabRowPlain: {
    flexDirection: 'row',
    marginBottom: 30,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  tabButtonPlain: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 6,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
  },
  tabTextPlain: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    lineHeight: 22,
  },
  activeTabTextPlain: {
    color: '#000',
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },

  // 휠 피커 컨테이너
  wheelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    height: 150,
  },
  wheelColumn: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    marginHorizontal: 10,
  },
  wheelText: {
    fontSize: 50,
    fontWeight: '400',
    color: '#000',
    marginVertical: 10,
  },
  wheelDot: {
    fontSize: 50,
    fontWeight: 'bold',
    color: '#000',
    marginTop: -10,
  },
  wheelUnit: {
    fontSize: 20,
    color: '#000',
    marginTop: 25,
    marginLeft: 10,
    fontWeight: '500',
  },

  // 시작 버튼 스타일
  samsungStartBtn: {
    width: '100%',
    backgroundColor: '#eee',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  samsungStartBtnText: {
    fontSize: 18,
    color: '#000',
    fontWeight: 'bold',
  },
});
