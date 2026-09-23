import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/avatar';
import { GifPicker } from '@/components/gif-picker';
import { t } from '@/i18n';
import { showAlert } from '@/lib/alert';
import { C, R } from '@/lib/theme';
import { kindFromMime, uploadMedia, MAX_MEDIA_BYTES } from '@/lib/media';
import { useVoiceRecorder } from '@/hooks/use-voice-recorder';
import type { Message, Profile } from '@/lib/types';

const QUICK_EMOJI = ['🔥', '😂', '❤️', '👍', '💀', '🎯', '⚔️', '😡', '😮', '🙏', '🤝', '🏆'];
const STICKERS = ['🐗', '👺', '🔥', '⚔️', '🍥', '👁️', '🌀', '💥', '🥷', '🎴', '🐉', '🌶️'];

export interface OutgoingMedia {
  kind: 'image' | 'video' | 'audio' | 'voice' | 'file' | 'sticker';
  uri: string;
  name?: string;
  size?: number;
  durationMs?: number;
  waveform?: number[];
  stickerText?: string;
  /** Remote URL (GIFs are sent as direct links, no upload). */
  remote?: boolean;
  width?: number;
  height?: number;
}

export function Composer({
  onSend,
  onSendMedia,
  onEditSave,
  replyTo,
  onCancelReply,
  editTarget,
  onCancelEdit,
  onTyping,
  memberNames,
  draft,
  onDraftChange,
}: {
  onSend: (text: string) => void;
  onSendMedia: (media: OutgoingMedia) => Promise<void>;
  onEditSave: (text: string) => void;
  replyTo: Message | null;
  onCancelReply: () => void;
  editTarget: Message | null;
  onCancelEdit: () => void;
  onTyping: (typing: boolean) => void;
  memberNames: Profile[];
  draft?: string;
  onDraftChange?: (draft: string) => void;
}) {
  const tr = t();
  const [text, setText] = useState(draft ?? '');
  const [emojiBar, setEmojiBar] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const typingSentRef = useRef(false);
  const voice = useVoiceRecorder();

  // Load edit target into the field.
  useEffect(() => {
    if (editTarget) {
      setText(editTarget.content);
      setEmojiBar(false);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [editTarget]);

  // Reply focus hint.
  useEffect(() => {
    if (replyTo) setTimeout(() => inputRef.current?.focus(), 60);
  }, [replyTo]);

  // Hydrate draft once.
  useEffect(() => {
    if (draft && text === '') setText(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  useEffect(() => {
    if (text.trim().length === 0 && typingSentRef.current) {
      typingSentRef.current = false;
      onTyping(false);
    }
  }, [text, onTyping]);

  const mentionQuery = useMemo(() => {
    const m = /@([a-zA-Z0-9_]*)$/.exec(text);
    return m ? m[1].toLowerCase() : null;
  }, [text]);

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    return memberNames
      .filter(
        (m) =>
          m.username.toLowerCase().startsWith(mentionQuery) ||
          m.display_name.toLowerCase().startsWith(mentionQuery),
      )
      .slice(0, 6);
  }, [mentionQuery, memberNames]);

  const applyMention = (user: Profile) => {
    setText((t) => t.replace(/@([a-zA-Z0-9_]*)$/, `@${user.username} `));
    setTimeout(() => inputRef.current?.focus(), 40);
  };

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    if (editTarget) {
      onEditSave(value);
    } else {
      onSend(value);
      onTyping(false);
      typingSentRef.current = false;
    }
    setText('');
    onDraftChange?.('');
  };

  /** Pick + upload a media file, then send it as a message. */
  const pickAndSend = async (source: 'photo' | 'video' | 'file' | 'camera') => {
    try {
      let uri = '';
      let mime: string | undefined;
      let name: string | undefined;
      let size: number | undefined;

      if (source === 'photo' || source === 'video' || source === 'camera') {
        if (source === 'camera') {
          const camPerm = await ImagePicker.requestCameraPermissionsAsync();
          if (!camPerm.granted) {
            showAlert(tr.settings.pushNotifications, tr.voice.micDenied);
            return;
          }
          const shot = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.85,
          });
          if (shot.canceled || !shot.assets[0]) return;
          const asset = shot.assets[0];
          uri = asset.uri;
          mime = asset.mimeType;
          name = asset.fileName ?? undefined;
          size = asset.fileSize ?? undefined;
        } else {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            showAlert(tr.settings.pushNotifications, tr.voice.micDenied);
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: source === 'photo' ? ['images'] : ['videos'],
            quality: 0.85,
            videoMaxDuration: 120,
          });
          if (result.canceled || !result.assets[0]) return;
          const asset = result.assets[0];
          uri = asset.uri;
          mime = asset.mimeType;
          name = asset.fileName ?? undefined;
          size = asset.fileSize ?? undefined;
        }
      } else {
        const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        uri = asset.uri;
        mime = asset.mimeType;
        name = asset.name;
        size = asset.size ?? undefined;
      }

      if (size && size > MAX_MEDIA_BYTES) {
        Alert.alert(tr.composer.uploadFailed, tr.composer.fileTooLarge);
        return;
      }

      setUploading(true);
      setUploadProgress(0);
      const kind = kindFromMime(mime, source === 'video' ? 'video' : 'file');
      const abort = { aborted: false };
      const { url, bytes } = await uploadMedia(uri, kind, {
        onProgress: (loaded, total) => setUploadProgress(total ? loaded / total : 0),
        signal: abort,
      });
      await onSendMedia({
        kind,
        uri: url,
        name,
        size: bytes,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message !== 'CANCELLED') {
        showAlert(tr.composer.uploadFailed, message === 'FILE_TOO_LARGE' ? tr.composer.fileTooLarge : message);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /** Send a picked GIF as a direct remote-URL image message (no upload). */
  const sendGif = async (gif: { url: string; width: number; height: number; alt: string }) => {
    setGifOpen(false);
    await onSendMedia({
      kind: 'image',
      uri: gif.url,
      name: gif.alt,
      remote: true,
      width: gif.width,
      height: gif.height,
    });
  };

  /** Send a text-sticker from the built-in set (no upload needed). */
  const sendSticker = async (sticker: string) => {
    setEmojiBar(false);
    await onSendMedia({ kind: 'sticker', uri: '', stickerText: sticker });
  };

  const sendVoice = async () => {
    const rec = await voice.stop();
    if (!rec) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const { url, bytes } = await uploadMedia(rec.uri, 'voice', {
        contentType: 'audio/mp4',
        onProgress: (loaded, total) => setUploadProgress(total ? loaded / total : 0),
      });
      await onSendMedia({
        kind: 'voice',
        uri: url,
        size: bytes,
        durationMs: rec.durationMs,
        waveform: voice.meter,
      });
    } catch (e) {
      showAlert(tr.composer.uploadFailed, e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const banner = editTarget
    ? { label: `${tr.common.edit}: ${editTarget.content.slice(0, 40)}`, onDismiss: onCancelEdit }
    : replyTo
      ? {
          label: `${tr.chat.replyTo} ${replyTo.sender?.display_name ?? ''}`,
          onDismiss: onCancelReply,
        }
      : null;

  if (voice.recording) {
    return (
      <View style={{ borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bgElevated, padding: 12, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.danger }} />
          <Text style={{ color: C.text, fontWeight: '700' }}>{tr.voice.recording}</Text>
          <Text style={{ color: C.textDim, fontVariant: ['tabular-nums'] }}>
            {Math.floor(voice.durationMs / 1000)}s
          </Text>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 26 }}>
            {voice.meter.slice(-30).map((lvl, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: Math.max(3, lvl * 26),
                  backgroundColor: C.red,
                  borderRadius: 2,
                }}
              />
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => void voice.cancel()}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 12,
              borderRadius: R.m,
              backgroundColor: C.surface,
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: C.textDim, fontWeight: '700' }}>{tr.voice.cancel}</Text>
          </Pressable>
          <Pressable
            onPress={() => void sendVoice()}
            style={({ pressed }) => ({
              flex: 2,
              paddingVertical: 12,
              borderRadius: R.m,
              backgroundColor: C.red,
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>{tr.voice.release}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bgElevated }}>
      {uploading ? (
        <View style={{ paddingHorizontal: 14, paddingVertical: 8, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator size="small" color={C.red} />
            <Text style={{ color: C.textDim, fontSize: 12, flex: 1 }}>
              {tr.composer.uploading} {Math.round(uploadProgress * 100)}%
            </Text>
          </View>
          <View style={{ height: 3, borderRadius: 2, backgroundColor: C.border }}>
            <View
              style={{
                height: 3,
                borderRadius: 2,
                backgroundColor: C.red,
                width: `${Math.max(5, Math.round(uploadProgress * 100))}%`,
              }}
            />
          </View>
        </View>
      ) : null}

      {mentionSuggestions.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          {mentionSuggestions.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => applyMention(m)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: C.bgCard,
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 999,
                paddingVertical: 4,
                paddingHorizontal: 8,
              }}
            >
              <Avatar url={m.avatar_url} name={m.display_name} size="s" />
              <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>@{m.username}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {emojiBar && (
        <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {QUICK_EMOJI.map((e) => (
              <Pressable key={e} onPress={() => setText((t) => t + e)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {STICKERS.map((s) => (
              <Pressable key={s} onPress={() => void sendSticker(s)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 28 }}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {banner && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderLeftWidth: 3,
            borderLeftColor: C.red,
            backgroundColor: 'rgba(220,38,38,0.08)',
          }}
        >
          <Text style={{ color: C.textDim, fontSize: 12.5 }} numberOfLines={1}>
            {banner.label}
          </Text>
          <Pressable onPress={banner.onDismiss} hitSlop={10}>
            <Ionicons name="close" size={18} color={C.textDim} />
          </Pressable>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', padding: 8, gap: 8 }}>
        <Pressable
          onPress={() => setEmojiBar((v) => !v)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: emojiBar ? C.redSoft : C.bgCard,
            borderWidth: 1,
            borderColor: emojiBar ? C.redBorder : C.border,
          }}
        >
          <Ionicons name="happy-outline" size={22} color={emojiBar ? C.red : C.textDim} />
        </Pressable>

        <Pressable
          onPress={() => void pickAndSend('photo')}
          style={{ width: 34, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="image-outline" size={22} color={C.textDim} />
        </Pressable>
        <Pressable
          onPress={() => void pickAndSend('camera')}
          style={{ width: 34, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="camera-outline" size={22} color={C.textDim} />
        </Pressable>
        <Pressable
          onPress={() => setGifOpen(true)}
          style={{ width: 34, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="flash-outline" size={20} color={C.textDim} />
        </Pressable>
        <Pressable
          onPress={() => void pickAndSend('file')}
          style={{ width: 34, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="attach" size={22} color={C.textDim} />
        </Pressable>

        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={(t) => {
            setText(t);
            onDraftChange?.(t);
            if (t.trim().length > 0 && !typingSentRef.current && !editTarget) {
              typingSentRef.current = true;
              onTyping(true);
            }
          }}
          placeholder={tr.chat.placeholder}
          placeholderTextColor={C.textFaint}
          multiline
          style={{
            flex: 1,
            maxHeight: 110,
            minHeight: 40,
            backgroundColor: C.bgCard,
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 9,
            color: C.text,
            fontSize: 15.5,
          }}
        />

        {text.trim().length === 0 ? (
          <Pressable
            onPress={() => void voice.start()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.bgCard,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Ionicons name="mic-outline" size={20} color={C.textDim} />
          </Pressable>
        ) : (
          <Pressable
            onPress={submit}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.red,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons name={editTarget ? 'checkmark' : 'send'} size={19} color="#fff" />
          </Pressable>
        )}
      </View>

      <GifPicker
        visible={gifOpen}
        onClose={() => setGifOpen(false)}
        onPick={(gif) => void sendGif(gif)}
      />
    </View>
  );
}
