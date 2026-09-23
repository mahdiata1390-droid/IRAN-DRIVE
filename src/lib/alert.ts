import { Alert, Platform } from 'react-native';

/**
 * Alert.alert() is a silent no-op on react-native-web, so send/edit/delete/DM
 * errors were previously invisible on the PWA (the clan reported "nothing
 * happens"). Route them through window.alert on web and keep the native
 * Alert on iOS/Android.
 */
export function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    // Fire-and-forget; browsers require user-gesture context for alert() but
    // these calls always originate from a tap handler.
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}
