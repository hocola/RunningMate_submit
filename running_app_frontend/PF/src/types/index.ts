// 1. 랭킹 데이터 타입
export interface RankingEntry {
  rank: number;
  name: string;
  record: string;
}

export interface RankingData {
  일간: RankingEntry[];
  주간: RankingEntry[];
  월간: RankingEntry[];
}

export type TabName = '일간' | '주간' | '월간';

// 2. 지도 및 위치 관련 타입
export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
  heading?: number | null;
}