import { useState, useEffect } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View, type DimensionValue } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { C, R } from '@/lib/theme';
import { shortTime } from '@/lib/time';
import type { ChatScope } from '@/hooks/use-messages';
import type { Message, Profile } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { EmptyState } from '@/components/ui';
import { t } from '@/i18n';

const REACTION_PICKS = ['👍', '🔥', '❤️', '😂', '😮', '😢', '💀', '🎯'];

function ModalShell({
  visible,
  onClose,
  children,
  height,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: DimensionValue;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={onClose}>
        <Pressable
          style={{
            marginTop: 'auto',
            backgroundColor: C.bgElevated,
            borderTopLeftRadius: R.xl,
            borderTopRightRadius: R.xl,
            borderTopWidth: 1,
            borderTopColor: C.border,
            maxHeight: height ?? '70%',
            paddingBottom: 20,
          }}
          onPress={() => {}}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const GRABBER = (
  <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
    <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.borderStrong }} />
  </View>
);

export function MessageActionsModal({
  visible,
  message,
  isMine,
  canModerate,
  canPin,
  onClose,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onTogglePin,
  onForwardMessage,
}: {
  visible: boolean;
  message: Message | null;
  isMine: boolean;
  canModerate: boolean;
  canPin: boolean;
  onClose: () => void;
  onReply: (m: Message) => void;
  onEdit: (m: Message) => void;
  onDelete: (m: Message) => void;
  onReact: (m: Message, emoji: string) => void;
  onTogglePin: (m: Message) => void;
  onForwardMessage: (m: Message) => void;
}) {
  if (!message) return null;
  const tr = t();
  const options: { label: string; icon: string; danger?: boolean; onPress: () => void }[] = [
    { label: tr.common.reply, icon: 'return-up-forward', onPress: () => onReply(message) },
    { label: tr.common.copy, icon: 'copy-outline', onPress: () => void Clipboard.setStringAsync(message.content) },
    { label: tr.common.forward, icon: 'arrow-redo-outline', onPress: () => onForwardMessage(message) },
    ...(isMine && !message.deleted_at
      ? [{ label: tr.common.edit, icon: 'create-outline', onPress: () => onEdit(message) }]
      : []),
    ...(canPin
      ? [
          {
            label: message.pinned ? `${tr.chat.jumpTo}: ${tr.chat.pinnedTitle}` : tr.chat.pinnedTitle,
            icon: 'bookmark-outline',
            onPress: () => onTogglePin(message),
          },
        ]
      : []),
    ...((isMine || canModerate) && !message.deleted_at
      ? [
          {
            label: tr.common.delete,
            icon: 'trash-outline',
            danger: true,
            onPress: () => onDelete(message),
          },
        ]
      : []),
  ];

  return (
    <ModalShell visible={visible} onClose={onClose} height="62%">
      {GRABBER}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}>
        {REACTION_PICKS.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => {
              onReact(message, emoji);
              onClose();
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: C.bgCard,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 20 }}>{emoji}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ paddingHorizontal: 12 }}>
        {options.map((opt) => (
          <Pressable
            key={opt.label}
            onPress={() => {
              onClose();
              setTimeout(opt.onPress, 120);
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 14,
              paddingHorizontal: 10,
              borderRadius: R.m,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: opt.danger ? C.danger : C.text }}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
    </ModalShell>
  );
}

export function SearchModal({
  visible,
  onClose,
  scope,
  memberById,
}: {
  visible: boolean;
  onClose: () => void;
  scope: ChatScope;
  memberById: Record<string, Profile>;
}) {
  const tr = t();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[] | null>(null);
  const [searching, setSearching] = useState(false);

  const runSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    setSearching(true);
    try {
      const { data } = await supabase.rpc('search_messages', {
        p_room_id: scope.kind === 'room' ? scope.id : null,
        p_conversation_id: scope.kind === 'dm' ? scope.id : null,
        p_q: q.trim(),
      });
      setResults((data ?? []) as Message[]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <ModalShell visible={visible} onClose={onClose} height="80%">
      {GRABBER}
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 17, paddingHorizontal: 16, marginBottom: 10 }}>
        {tr.chat.searchTitle}
      </Text>
      <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        <TextInput
          value={query}
          onChangeText={(q) => void runSearch(q)}
          placeholder={tr.chat.searchHint}
          placeholderTextColor={C.textFaint}
          autoFocus
          style={{
            backgroundColor: C.bgCard,
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: R.m,
            paddingHorizontal: 14,
            paddingVertical: 10,
            color: C.text,
            fontSize: 15,
          }}
        />
      </View>
      {searching ? <Text style={{ color: C.textFaint, textAlign: 'center' }}>{tr.chat.searching}</Text> : null}
      {results === null ? (
        <EmptyState icon="🔍" title={tr.chat.searchEmptyTitle} subtitle={tr.chat.searchEmptySubtitle} />
      ) : results.length === 0 ? (
        <EmptyState icon="🜲" title={tr.chat.noMatches} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Text style={{ color: C.red, fontWeight: '700', fontSize: 13 }}>
                {memberById[item.sender_id]?.display_name ?? 'Member'} · {shortTime(item.created_at)}
              </Text>
              <Text style={{ color: C.text, fontSize: 14.5, marginTop: 2 }}>{item.content}</Text>
            </View>
          )}
        />
      )}
    </ModalShell>
  );
}

export function ForwardModal({
  visible,
  onClose,
  onForward,
}: {
  visible: boolean;
  onClose: () => void;
  onForward: (target: { kind: 'room' | 'dm'; id: string; label: string }) => void;
}) {
  const tr = t();
  const [targets, setTargets] = useState<
    { kind: 'room' | 'dm'; id: string; label: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(false);
    void (async () => {
      const [roomsRes, dmsRes] = await Promise.all([
        supabase.from('rooms').select('id,name,kind').order('kind').order('name'),
        supabase.rpc('my_dms'),
      ]);
      const list: { kind: 'room' | 'dm'; id: string; label: string }[] = [];
      for (const r of (roomsRes.data ?? []) as { id: string; name: string; kind: string }[]) {
        list.push({ kind: 'room', id: r.id, label: r.name });
      }
      for (const d of (dmsRes.data ?? []) as {
        conversation_id: string;
        other_display_name: string;
      }[]) {
        list.push({ kind: 'dm', id: d.conversation_id, label: d.other_display_name });
      }
      setTargets(list);
      setError(list.length === 0 && !!roomsRes.error);
      setLoading(false);
    })();
  }, [visible]);

  return (
    <ModalShell visible={visible} onClose={onClose} height="60%">
      {GRABBER}
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 17, paddingHorizontal: 16, marginBottom: 10 }}>
        {tr.chat.forwardTitle}
      </Text>
      {loading ? (
        <Text style={{ color: C.textFaint, textAlign: 'center', paddingVertical: 20 }}>{tr.common.loading}</Text>
      ) : error || targets.length === 0 ? (
        <EmptyState icon="📤" title={tr.chat.forwardTitle} subtitle={tr.common.error} />
      ) : (
        <FlatList
          data={targets}
          keyExtractor={(tItem) => `${tItem.kind}:${tItem.id}`}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onClose();
                setTimeout(() => onForward(item), 120);
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 12,
                paddingHorizontal: 10,
                borderRadius: R.m,
                marginBottom: 4,
                backgroundColor: C.bgCard,
                borderWidth: 1,
                borderColor: C.border,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: C.red, fontWeight: '800', fontSize: 12 }}>
                {item.kind === 'room' ? '#' : '@'}
              </Text>
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={{ color: C.red, fontWeight: '700', fontSize: 13 }}>{tr.common.send} →</Text>
            </Pressable>
          )}
        />
      )}
    </ModalShell>
  );
}

export function PinnedModal({
  visible,
  onClose,
  pinned,
  memberById,
  onJumpTo,
}: {
  visible: boolean;
  onClose: () => void;
  pinned: Message[];
  memberById: Record<string, Profile>;
  onJumpTo?: (m: Message) => void;
}) {
  const tr = t();
  return (
    <ModalShell visible={visible} onClose={onClose} height="60%">
      {GRABBER}
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 17, paddingHorizontal: 16, marginBottom: 10 }}>
        📌 {tr.chat.pinnedListTitle}
      </Text>
      {pinned.length === 0 ? (
        <EmptyState
          icon="📌"
          title={tr.chat.pinnedEmptyTitle}
          subtitle={tr.chat.pinnedEmptySubtitle}
        />
      ) : (
        <FlatList
          data={pinned}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onClose();
                setTimeout(() => onJumpTo?.(item), 120);
              }}
              style={({ pressed }) => ({ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border, opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={{ color: C.gold, fontWeight: '700', fontSize: 13 }}>
                {memberById[item.sender_id]?.display_name ?? tr.common.members} · {shortTime(item.created_at)}
              </Text>
              <Text style={{ color: C.text, fontSize: 14.5, marginTop: 2 }}>{item.content}</Text>
              <Text style={{ color: C.red, fontSize: 11.5, marginTop: 4, fontWeight: '600' }}>↑ {tr.chat.jumpTo}</Text>
            </Pressable>
          )}
        />
      )}
    </ModalShell>
  );
}
