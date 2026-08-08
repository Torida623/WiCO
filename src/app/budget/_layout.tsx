import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePageDissolveCurtain } from '@/hooks/use-page-dissolve';

const PAGE_CURL_IMAGE = require('@/assets/images/budget/page-curl.jpg');

export default function BudgetLayout() {
  const { curlStyle } = usePageDissolveCurtain();

  return (
    <View style={styles.flex}>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="living-costs" options={{ animation: 'none' }} />
        <Stack.Screen name="summary" options={{ animation: 'none' }} />
        <Stack.Screen name="receipt-scan" />
      </Stack>
      <Animated.View style={[styles.absoluteFill, curlStyle]} pointerEvents="none">
        <Image source={PAGE_CURL_IMAGE} style={styles.absoluteFill} contentFit="cover" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
  },
});
