import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/avatar';
import { C, R } from '@/lib/theme';
import type { Message, Profile } from '@/lib/types';

const QUICK_EMOJI = ['🔥', '😂', '❤️', '👍', '💀', '🎯', '⚔️', '😡', '😮', '🙏', '🤝', '🏆'];

export function Composer({
  onSend,
  onEditSave,
  replyTo,
  onCancelReply,
  editTarget,
  onCancelEdit,
  onTyping,
  memberNames,
}: {
  onSend: (text: string) => void;
  onEditSave: (text: string) => void;
  replyTo: Message | null;
  onCancelReply: () => void;
  editTarget: Message | null;
  onCancelEdit: () => void;
  onTyping: (typing: boolean) => void;
  memberNames: Profile[];
}) {
  const [text, setText] = useState('');
  const [emojiBar, setEmojiBar] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const typingSentRef = useRef(false);

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
    setEmojiBar(false);
  };

  const banner = editTarget
    ? { label: 'Editing message', onDismiss: onCancelEdit }
    : replyTo
      ? { label: `Replying to ${replyTo.sender?.display_name ?? 'message'}`, onDismiss: onCancelReply }
      : null;

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bgElevated }}>
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

      {emojiBar && (
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
          {QUICK_EMOJI.map((e) => (
            <Pressable
              key={e}
              onPress={() => setText((t) => t + e)}
              style={{ padding: 4 }}
            >
              <Text style={{ fontSize: 22 }}>{e}</Text>
            </Pressable>
          ))}
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

        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={(t) => {
            setText(t);
            if (t.trim().length > 0 && !typingSentRef.current && !editTarget) {
              typingSentRef.current = true;
              onTyping(true);
            }
          }}
          placeholder="Message…"
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

        <Pressable
          onPress={submit}
          disabled={text.trim().length === 0}
          style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: text.trim() ? C.red : C.surface,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Ionicons
            name={editTarget ? 'checkmark' : 'send'}
            size={19}
            color={text.trim() ? '#fff' : C.textFaint}
          />
        </Pressable>
      </View>
    </View>
  );
}
