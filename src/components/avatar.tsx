import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { C } from '@/lib/theme';

const PALETTE = ['#DC2626', '#A78BFA', '#60A5FA', '#2DD4BF', '#F59E0B', '#F472B6'];

function hashColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

const SIZES = { s: 28, m: 40, l: 56, xl: 84 } as const;

export function Avatar({
  url,
  name,
  size = 'm',
  online,
}: {
  url?: string | null;
  name: string;
  size?: keyof typeof SIZES;
  online?: boolean;
}) {
  const s = SIZES[size];
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase();
  const dot = Math.max(10, Math.round(s * 0.28));
  return (
    <View style={{ width: s, height: s }}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: C.bgCard }}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <View
          style={{
            width: s,
            height: s,
            borderRadius: s / 2,
            backgroundColor: hashColor(name),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: s * 0.38 }}>{initials}</Text>
        </View>
      )}
      {online !== undefined && (
        <View
          style={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: online ? C.online : C.textFaint,
            borderWidth: 2,
            borderColor: C.bg,
          }}
        />
      )}
    </View>
  );
}
