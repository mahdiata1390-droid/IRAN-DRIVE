import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { C, R } from '@/lib/theme';

type GlassSurfaceProps = ViewProps & {
  tone?: 'default' | 'strong';
  radius?: number;
  borderless?: boolean;
};

export function GlassSurface({ children, style, tone = 'default', radius = R.xl, borderless = false, ...props }: GlassSurfaceProps) {
  return (
    <View
      {...props}
      style={[
        styles.glassBase,
        {
          backgroundColor: tone === 'strong' ? C.glassStrong : C.glass,
          borderRadius: radius,
          borderColor: borderless ? 'transparent' : C.glassBorder,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function GlassCard({ children, style, ...props }: GlassSurfaceProps) {
  return (
    <GlassSurface {...props} style={[styles.glassCard, style]}>
      {children}
    </GlassSurface>
  );
}

export function GlassHeader({ children, style, ...props }: GlassSurfaceProps) {
  return (
    <GlassSurface {...props} tone="strong" radius={26} style={[styles.glassHeader, style]}>
      {children}
    </GlassSurface>
  );
}

export function GlassBottomSheet({ children, style, ...props }: GlassSurfaceProps) {
  return (
    <GlassSurface {...props} tone="strong" radius={28} style={[styles.glassSheet, style]}>
      {children}
    </GlassSurface>
  );
}

export function GlassButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'subtle';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: string;
}) {
  const bg =
    variant === 'primary'
      ? 'rgba(220,38,38,0.88)'
      : variant === 'danger'
        ? 'rgba(239,68,68,0.12)'
        : variant === 'subtle'
          ? C.glass
          : 'transparent';
  const fg =
    variant === 'primary' ? '#fff' : variant === 'danger' ? C.danger : variant === 'subtle' ? C.text : C.textDim;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.glassButton,
        {
          backgroundColor: bg,
          borderColor: variant === 'ghost' ? C.glassBorder : variant === 'danger' ? 'rgba(239,68,68,0.38)' : 'transparent',
          borderWidth: variant === 'ghost' || variant === 'danger' ? 1 : 0,
          opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <Text style={{ fontSize: 15 }}>{icon}</Text> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function GlassPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: active ? C.redSoft : C.glass,
        borderWidth: 1,
        borderColor: active ? C.redBorder : C.glassBorder,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <Text style={{ color: active ? C.red : C.textDim, fontSize: 12.5, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export function GlassIconButton({
  icon,
  onPress,
  active = false,
  tint = 'default',
  style,
}: {
  icon: string;
  onPress?: () => void;
  active?: boolean;
  tint?: 'default' | 'red' | 'soft';
  style?: StyleProp<ViewStyle>;
}) {
  const palette =
    tint === 'red'
      ? { bg: C.redSoft, border: C.redBorder, fg: C.red }
      : tint === 'soft'
        ? { bg: C.glass, border: C.glassBorder, fg: C.text }
        : { bg: C.bgCard, border: C.border, fg: C.textDim };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.glassIconButton,
        {
          backgroundColor: active ? palette.bg : palette.bg,
          borderColor: palette.border,
          opacity: pressed ? 0.74 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: palette.fg, fontSize: 18, fontWeight: '700' }}>{icon}</Text>
    </Pressable>
  );
}

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

export const styles = StyleSheet.create({
  glassBase: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  glassCard: {
    padding: 18,
  },
  glassHeader: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.glassBorder,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  glassSheet: {
    borderWidth: 1,
    borderColor: C.glassBorder,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  glassButton: {
    borderRadius: R.m,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
  },
  glassIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});
