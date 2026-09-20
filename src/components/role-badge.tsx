import { Text, View } from 'react-native';
import { roleColor, roleLabel } from '@/lib/roles';
import type { ClanRole } from '@/lib/types';

export function RoleBadge({ role, size = 'm' }: { role: ClanRole; size?: 's' | 'm' }) {
  const color = roleColor(role);
  const fontSize = size === 's' ? 9 : 10;
  return (
    <View
      style={{
        backgroundColor: `${color}22`,
        borderColor: `${color}55`,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: size === 's' ? 6 : 8,
        paddingVertical: 2,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color, fontSize, fontWeight: '800', letterSpacing: 0.3 }}>
        {roleLabel(role).toUpperCase()}
      </Text>
    </View>
  );
}
