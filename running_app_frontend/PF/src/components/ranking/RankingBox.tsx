import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import RankingItem from './RankingItem';
import { fetchRankingData } from '../../api/rankingApi';
import { TabName, RankingEntry } from '../../types';

// HomeScreen의 RankingBox와 매칭을 위해 export const 사용
export const RankingBox = () => {
  const [activeTab, setActiveTab] = useState<TabName>('일간');
  const [isLoading, setIsLoading] = useState(true);
  const [rankingList, setRankingList] = useState<RankingEntry[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchRankingData(activeTab);
        setRankingList(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [activeTab]);

  return (
    <View style={styles.container}>
      <View style={styles.listContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#1E90FF" />
        ) : (
          // rankingList 데이터 매핑
          rankingList.map((item: RankingEntry, index) => (
            <RankingItem key={`${item.name}-${item.rank}-${index}`} {...item} />
          ))
        )}
      </View>

      {/* 탭 버튼 영역 */}
      <View style={styles.tabContainer}>
        {(['일간', '주간', '월간'] as TabName[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// export default RankingBox;  <-- ❌ 이거 지움 (위에서 export const 했으므로)

const styles = StyleSheet.create({
  container: { 
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 20,
    marginTop: 30, 
    width: '90%',
    alignSelf: 'center',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  listContainer: { 
    minHeight: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 30,
    borderRadius: 20,
    backgroundColor: '#EEE',
    marginTop: 15, 
    marginBottom: 0,
  },
  activeTabButton: {
    backgroundColor: '#1E90FF',
  },
  tabText: {
    fontSize: 14,
    color: '#555',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
});