import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { C, R } from '@/lib/theme';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'subtle';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    variant === 'primary'
      ? C.red
      : variant === 'danger'
        ? 'rgba(239,68,68,0.12)'
        : variant === 'subtle'
          ? C.surface
          : 'transparent';
  const fg =
    variant === 'primary' ? '#fff' : variant === 'danger' ? C.danger : variant === 'subtle' ? C.text : C.textDim;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: R.m,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        variant === 'ghost' && { borderWidth: 1, borderColor: C.border },
        variant === 'danger' && { borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)' },
        style,
      ]}
    >
      {loading && <ActivityIndicator size="small" color={fg} />}
      <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function Input({
  label,
  error,
  style,
  ...props
}: TextInputProps & { label?: string; error?: string | null; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text style={{ color: C.textDim, fontSize: 12, fontWeight: '600', letterSpacing: 0.4 }}>
          {label.toUpperCase()}
        </Text>
      ) : null}
      <RNTextInput
        placeholderTextColor={C.textFaint}
        autoCapitalize="none"
        {...props}
        style={[
          {
            backgroundColor: C.bgCard,
            borderColor: error ? C.danger : C.border,
            borderWidth: 1,
            borderRadius: R.m,
            paddingHorizontal: 14,
            paddingVertical: 13,
            color: C.text,
            fontSize: 15,
          },
          style,
        ]}
      />
      {error ? <Text style={{ color: C.danger, fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: active ? `${color ?? C.red}22` : C.bgCard,
        borderWidth: 1,
        borderColor: active ? `${color ?? C.red}66` : C.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: active ? color ?? C.red : C.textDim, fontSize: 12, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ alignItems: 'center', padding: 40, gap: 8, marginTop: 40 }}>
      <Text style={{ fontSize: 44, opacity: 0.7 }}>{icon}</Text>
      <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{title}</Text>
      {subtitle ? (
        <Text style={{ color: C.textFaint, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function Spinner() {
  return <ActivityIndicator color={C.red} style={{ marginTop: 24 }} />;
}

export const styles = StyleSheet.create({});
