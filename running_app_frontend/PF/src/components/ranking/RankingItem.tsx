import React from 'react';
import { View, Text, StyleSheet } from 'react-native'; // StyleSheet 추가
import { RankingEntry } from '../../types';

const RankingItem: React.FC<RankingEntry> = ({ rank, name, record }) => {
  return (
    // 스타일 이름 단순화
    <View style={styles.container}>
      {/* 등수 */}
      <Text style={styles.rankText}>{rank}등</Text>

      {/* 이름과 기록 */}
      <View style={styles.textWrapper}>
        <Text style={styles.nameText}>{name}</Text>
        <Text style={styles.recordText}>
          달린 거리 & 달린 시간: {record}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
   // borderBottomWidth: 1,
   // borderBottomColor: '#F0F0F0',
    width: '100%',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E90FF',
    marginRight: 15,
    width: 40,
    textAlign: 'center',
  },
  textWrapper: {
    flex: 1,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  recordText: {
    fontSize: 13,
    color: '#777',
  },
});

export default RankingItem;