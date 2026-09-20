import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/i18n';
import { C } from '@/lib/theme';
import { useChats } from '@/hooks/use-chats';

export default function TabsLayout() {
  const tr = t();
  const { unreadByChat } = useChats();
  const totalUnread = Object.values(unreadByChat).reduce((sum, n) => sum + n, 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.red,
        tabBarInactiveTintColor: C.textFaint,
        tabBarStyle: {
          backgroundColor: C.bgElevated,
          borderTopColor: C.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.2 },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen
        name="chats"
        options={{
          title: tr.tabs.chats,
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
          tabBarBadge: totalUnread > 0 ? String(totalUnread) : undefined,
          tabBarBadgeStyle: { backgroundColor: C.red, color: '#fff', fontWeight: '700' },
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: tr.tabs.friends,
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: tr.tabs.members,
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="war"
        options={{
          title: tr.tabs.war,
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: tr.tabs.profile,
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
