import { useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/i18n';
import { C } from '@/lib/theme';
import { VoicePlayer } from '@/components/voice-player';
import type { Message } from '@/lib/types';

/**
 * Media body renderer used inside MessageBubble. Falls back gracefully when
 * a signed URL has expired (tap-to-refresh reloads the chat).
 */
export function MediaBody({
  msg,
  mine,
}: {
  msg: Message;
  mine: boolean;
}) {
  const tr = t();
  const [failed, setFailed] = useState(false);
  const kind = msg.media_type;
  const url = msg.media_url ?? '';

  if (!kind) return null;

  if (kind === 'image' || kind === 'sticker') {
    const size = kind === 'sticker' ? 140 : 220;
    if (failed) return <MediaError mine={mine} />;
    return (
      <Pressable onPress={() => void Linking.openURL(url)}>
        <Image
          source={{ uri: url }}
          style={{
            width: size,
            height: size,
            borderRadius: kind === 'sticker' ? 12 : 10,
            backgroundColor: C.surface,
          }}
          resizeMode={kind === 'sticker' ? 'contain' : 'cover'}
          onError={() => setFailed(true)}
        />
      </Pressable>
    );
  }

  if (kind === 'video') {
    if (failed) return <MediaError mine={mine} />;
    return (
      <Video
        source={{ uri: url }}
        useNativeControls
        style={{ width: 240, height: 160, borderRadius: 10, backgroundColor: '#000' }}
        onError={() => setFailed(true)}
      />
    );
  }

  if (kind === 'voice' || kind === 'audio') {
    return (
      <VoicePlayer
        uri={url}
        durationMs={msg.media_duration_ms ?? 0}
        waveform={msg.media_waveform as number[] | undefined}
        mine={mine}
      />
    );
  }

  // Documents / any file
  return (
    <Pressable
      onPress={() => void Linking.openURL(url)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: mine ? 'rgba(255,255,255,0.15)' : C.surface,
        padding: 10,
        borderRadius: 10,
        minWidth: 170,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 8,
          backgroundColor: mine ? 'rgba(255,255,255,0.2)' : C.redSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="document-text" size={20} color={mine ? '#fff' : C.red} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ color: mine ? '#fff' : C.text, fontSize: 13.5, fontWeight: '600' }}>
          {msg.media_name ?? tr.composer.file}
        </Text>
        <Text style={{ color: mine ? 'rgba(255,255,255,0.7)' : C.textFaint, fontSize: 11 }}>
          {msg.media_size ? `${(msg.media_size / 1024 / 1024).toFixed(1)} MB` : '—'}
        </Text>
      </View>
      <Ionicons name="download" size={18} color={mine ? '#fff' : C.red} />
    </Pressable>
  );
}

function MediaError({ mine }: { mine: boolean }) {
  const tr = t();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 }}>
      <Ionicons name="cloud-offline" size={16} color={mine ? 'rgba(255,255,255,0.8)' : C.textFaint} />
      <Text style={{ color: mine ? 'rgba(255,255,255,0.8)' : C.textFaint, fontSize: 12 }}>
        {tr.composer.uploadFailed} · {tr.common.retry}
      </Text>
    </View>
  );
}

export function UploadProgressRow({
  progress,
  onCancel,
}: {
  progress: number;
  onCancel?: () => void;
}) {
  const tr = t();
  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 10,
        padding: 12,
        marginHorizontal: 14,
        marginVertical: 4,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <ActivityIndicator size="small" color={C.red} />
        <Text style={{ color: C.textDim, fontSize: 12, flex: 1 }}>
          {tr.composer.uploading} {Math.round(progress * 100)}%
        </Text>
        {onCancel ? (
          <Pressable onPress={onCancel} hitSlop={8}>
            <Ionicons name="close" size={18} color={C.danger} />
          </Pressable>
        ) : null}
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: C.border, overflow: 'hidden' }}>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: C.red, width: `${Math.round(progress * 100)}%` }} />
      </View>
    </View>
  );
}
