import { Tabs } from 'expo-router';

export default function AppTabs() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'WiCO', tabBarLabel: '献立' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
    </Tabs>
  );
}
