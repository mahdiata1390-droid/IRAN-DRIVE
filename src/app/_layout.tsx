import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { SessionProvider, useSession } from '@/providers/session';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();
setTimeout(() => void SplashScreen.hideAsync(), 400);

/** Registers push permissions/tokens and handles notification taps. */
function PushRegistrar() {
  const { session } = useSession();

  useEffect(() => {
    if (!session) return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    let mounted = true;
    (async () => {
      const settings = await Notifications.getPermissionsAsync();
      let granted = settings.granted;
      if (!granted && settings.canAskAgain) {
        granted = (await Notifications.requestPermissionsAsync()).granted;
      }
      if (!granted || !mounted) return;
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) return; // push delivery activates once EAS project is configured
        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        await supabase.from('push_tokens').upsert(
          { user_id: session.user.id, token, platform: Platform.OS },
          { onConflict: 'token' },
        );
      } catch {
        // Push tokens require a development build / EAS setup — ignore in Expo Go.
      }
    })();

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        conversation_id?: string;
        room_id?: string;
      };
      if (data?.conversation_id) router.push(`/dm/${data.conversation_id}`);
      else if (data?.room_id) router.push(`/room/${data.room_id}`);
    });

    return () => {
      mounted = false;
      responseSub.remove();
    };
  }, [session]);

  return null;
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="light" />
      <PushRegistrar />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="room/[id]" />
        <Stack.Screen name="dm/[id]" />
        <Stack.Screen name="member/[id]" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="new-room" />
      </Stack>
    </SessionProvider>
  );
}
