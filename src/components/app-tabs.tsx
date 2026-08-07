import { Tabs } from 'expo-router';

export default function AppTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="index" options={{ title: 'WiCO', tabBarLabel: '献立', unmountOnBlur: true }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="menu-chat" options={{ href: null, title: '献立を考える', unmountOnBlur: true }} />
      <Tabs.Screen name="decided-menus" options={{ href: null, title: '献立ノート', unmountOnBlur: true }} />
      <Tabs.Screen name="shopping-memo" options={{ href: null, title: 'お買い物メモ', unmountOnBlur: true }} />
      <Tabs.Screen name="food-preferences" options={{ href: null, title: '苦手・アレルギー登録', unmountOnBlur: true }} />
      <Tabs.Screen name="budget" options={{ href: null, title: 'お買い物ノート', unmountOnBlur: true }} />
      <Tabs.Screen name="meal-log" options={{ href: null, title: '料理の思い出', unmountOnBlur: true }} />
    </Tabs>
  );
}
