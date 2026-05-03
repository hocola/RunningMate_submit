import { TabName, RankingEntry } from '../types';
import { apiClient } from './authApi';

// 시간 포맷팅 (초 -> 시간:분:초)
const formatDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}시간 ${minutes}분 ${seconds}초`;
  }
  if (minutes > 0) {
    return `${minutes}분 ${seconds}초`;
  }
  return `${seconds}초`;
};

// 거리 포맷팅 (미터 -> km)
const formatDistance = (meters: number): string => {
  const km = meters / 1000;
  return `${km.toFixed(2)}km`;
};

// API 응답 데이터를 RankingEntry 형식으로 변환
const convertToRankingEntry = (
  data: { nickname: string; totalDistance: number; totalDuration: number }[],
): RankingEntry[] => {
  return data.map((item, index) => ({
    rank: index + 1,
    name: item.nickname,
    record: `${formatDistance(item.totalDistance)} / ${formatDuration(item.totalDuration)}`,
  }));
};

// 랭킹 데이터 요청
export const fetchRankingData = async (tab: TabName): Promise<RankingEntry[]> => {
  try {
    let endpoint = '/ranking/daily';
    if (tab === '주간') {
      endpoint = '/ranking/weekly';
    } else if (tab === '월간') {
      endpoint = '/ranking/monthly';
    }

    const response = await apiClient.get(endpoint);
    return convertToRankingEntry(response.data);
  } catch (error) {
    console.error(`[API] ${tab} 랭킹 데이터 요청 실패:`, error);
    return [];
  }
};