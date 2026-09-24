import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionProvider, useSession } from '@/providers/session';
import { AppErrorBoundary } from '@/components/app-error-boundary';
import { initI18n, setLang } from '@/i18n';
import { setTheme, themeMode } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();
setTimeout(() => void SplashScreen.hideAsync(), 400);

/** Registers push permissions/tokens and handles notification taps (deep links). */
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
        announcement_id?: string;
      };
      if (data?.conversation_id) router.push(`/dm/${data.conversation_id}`);
      else if (data?.room_id) router.push(`/room/${data.room_id}`);
      else if (data?.announcement_id) router.push('/announcements');
    });

    return () => {
      mounted = false;
      responseSub.remove();
    };
  }, [session]);

  return null;
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  // Restore language + theme before first paint of routes.
  useEffect(() => {
    void (async () => {
      const lang = await initI18n();
      const storedMode = await AsyncStorage.getItem('app.theme');
      setTheme(storedMode === 'light' ? 'light' : 'dark');
      // Align native RTL with the restored language (no reload on cold start).
      await setLang(lang).catch(() => undefined);
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  return (
    <AppErrorBoundary>
      <SessionProvider>
        <StatusBar style={themeMode() === 'light' ? 'dark' : 'light'} />
        <PushRegistrar />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="room/[id]" />
        <Stack.Screen name="dm/[id]" />
        <Stack.Screen name="member/[id]" />
        <Stack.Screen name="room-info" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="new-room" />
        <Stack.Screen name="search" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="announcements" />
        </Stack>
      </SessionProvider>
    </AppErrorBoundary>
  );
}
