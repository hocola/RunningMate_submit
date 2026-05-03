import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const ITEM_HEIGHT = 50; // 높이 고정

interface WheelPickerProps {
  items: string[]; // 표시할 데이터 배열
  initValue: string; // 초기 선택값
  onValueChange: (val: string) => void; // 값 변경 시 콜백
}

const WheelPicker: React.FC<WheelPickerProps> = ({ items, initValue, onValueChange }) => {
  const initIndex = items.indexOf(initValue) >= 0 ? items.indexOf(initValue) : 0;
  
  return (
    <View style={styles.container}>
      <View style={styles.selectionOverlay} />
      <FlatList
        data={items}
        keyExtractor={(_, index) => index.toString()}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT} // 아이템 높이 단위로 스냅
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        initialScrollIndex={initIndex}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }} // 중앙 정렬을 위한 여백
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          if (newIndex >= 0 && newIndex < items.length) {
            onValueChange(items[newIndex]);
          }
        }}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <Text style={styles.itemText}>{item}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: ITEM_HEIGHT * 3, width: 70, overflow: 'hidden' },
  selectionOverlay: {
    position: 'absolute', top: ITEM_HEIGHT, left: 0, right: 0, height: ITEM_HEIGHT,
    backgroundColor: '#F0F0F0', borderRadius: 10, zIndex: -1
  },
  itemContainer: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  itemText: { fontSize: 28, fontWeight: 'bold', color: '#333', lineHeight: ITEM_HEIGHT, includeFontPadding: false }
});

export default WheelPicker;