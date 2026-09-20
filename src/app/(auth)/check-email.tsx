import { Redirect, Stack } from 'expo-router';
import { C } from '@/lib/theme';

/** Legacy route kept so deep links don't break; forwards to login. */
export default function CheckEmailScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Redirect href="/(auth)/login" />
    </>
  );
}
