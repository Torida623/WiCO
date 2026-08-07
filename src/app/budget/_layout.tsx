import { Stack } from 'expo-router';

export default function BudgetLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="living-costs" options={{ animation: 'flip' }} />
      <Stack.Screen name="summary" options={{ animation: 'flip' }} />
      <Stack.Screen name="receipt-scan" />
    </Stack>
  );
}
