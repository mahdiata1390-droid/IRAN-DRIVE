import { View, StyleSheet } from 'react-native';
import { SharinganEye } from '@/components/shared-eyes';

export function LoadingShimmer({ size = 48 }: { size?: number }) {
  return (
    <View style={styles.wrap}>
      <SharinganEye size={size} state="loading" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
