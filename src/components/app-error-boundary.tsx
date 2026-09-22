import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Top-level error boundary. Without it a runtime error anywhere in the tree
 * unmounts everything and the PWA shows a blank white page — which is exactly
 * what happened with the realtime channel crash reported by clan members.
 *
 * On web it also offers a hard reload (clearing the SW-cached shell) so a stale
 * bundle can never keep a user stuck on a broken version.
 */
interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error.message, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0B' }}>
        <LinearGradient colors={['#0A0A0B', '#140404']} style={StyleSheet.absoluteFill} />
        <ScrollView
          contentContainerStyle={{
            flex: 1,
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 28,
          }}
        >
          <Text style={{ color: '#DC2626', fontSize: 40 }}>🗾</Text>
          <Text style={{ color: '#F5F5F4', fontSize: 24, fontWeight: '900', marginTop: 12 }}>
            UCHIHA
          </Text>
          <Text style={{ color: '#A8A29E', fontSize: 15, textAlign: 'center', marginTop: 8 }}>
            یه خطای غیرمنتظره رخ داد. لطفاً دوباره تلاش کن.
          </Text>
          {__DEV__ ? (
            <Text style={{ color: '#78716C', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
              {this.state.error.message}
            </Text>
          ) : null}
          <Pressable
            onPress={() => {
              if (Platform.OS === 'web' && 'caches' in window) {
                void caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
              }
              if (Platform.OS === 'web') window.location.reload();
            }}
            style={{
              marginTop: 24,
              backgroundColor: '#DC2626',
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 32,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>تلاش مجدد</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}
