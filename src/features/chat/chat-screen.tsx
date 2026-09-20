import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Composer } from '@/components/composer';
import { MessageBubble, type ReactionGroup } from '@/components/message-bubble';
import { MessageActionsModal, PinnedModal, SearchModal } from '@/features/chat/chat-modals';
import { EmptyState, Spinner } from '@/components/ui';
import { useMessages, type ChatScope } from '@/hooks/use-messages';
import { useSession } from '@/providers/session';
import { t } from '@/i18n';
import { C, R } from '@/lib/theme';
import { dayLabel } from '@/lib/time';
import { canModerate, canPin, roleColor } from '@/lib/roles';
import type { Message, Profile } from '@/lib/types';

export function ChatScreen({
  scope,
  title,
  subtitle,
  memberProfiles,
}: {
  scope: ChatScope;
  title: string;
  subtitle: string;
  memberProfiles: Profile[];
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, profile } = useSession();
  const myId = session?.user.id ?? null;
  const {
    messages,
    reactionsByMessage,
    loading,
    loadingMore,
    hasMore,
    typingNames,
    partnerLastRead,
    pinnedMessages,
    send,
    sendMedia,
    edit,
    remove,
    toggleReaction,
    togglePin,
    markRead,
    search,
    loadMore,
    notifyTyping,
  } = useMessages(scope, myId);

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editTarget, setEditTarget] = useState<Message | null>(null);
  const [actionsFor, setActionsFor] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const tr = t();

  const myRole = profile?.role ?? 'member';
  const isRoom = scope.kind === 'room';

  const memberById = useMemo(() => {
    const map: Record<string, Profile> = {};
    for (const m of memberProfiles) map[m.id] = m;
    return map;
  }, [memberProfiles]);

  const usernames = useMemo(
    () => new Set(memberProfiles.map((m) => m.username.toLowerCase())),
    [memberProfiles],
  );

  const data = useMemo(() => [...messages].reverse(), [messages]);

  const notifyTypingForMe = useMemo(() => {
    const fn = notifyTyping(profile?.display_name ?? 'someone');
    return fn;
  }, [notifyTyping, profile?.display_name]);

  // Mark chat as read whenever messages arrive while the screen is open.
  useEffect(() => {
    if (!loading && messages.length > 0) {
      const t = setTimeout(() => markRead(), 400);
      return () => clearTimeout(t);
    }
  }, [messages.length, loading, markRead]);

  const parseMentions = useCallback(
    (text: string): string[] => {
      const ids: string[] = [];
      for (const match of text.matchAll(/@([a-zA-Z0-9_]+)/g)) {
        const m = memberProfiles.find((p) => p.username.toLowerCase() === match[1].toLowerCase());
        if (m && !ids.includes(m.id)) ids.push(m.id);
      }
      return ids;
    },
    [memberProfiles],
  );

  const handleSend = useCallback(
    (text: string) => {
      void (async () => {
        try {
          await send(text, replyTo?.id ?? null, parseMentions(text));
          setReplyTo(null);
        } catch (e) {
          Alert.alert('Message failed', e instanceof Error ? e.message : 'Try again.');
        }
      })();
    },
    [send, replyTo, parseMentions],
  );

  const handleSendMedia = useCallback(
    async (media: Parameters<typeof sendMedia>[0]) => {
      try {
        await sendMedia(media);
      } catch (e) {
        Alert.alert('Send failed', e instanceof Error ? e.message : 'Try again.');
      }
    },
    [sendMedia],
  );

  const handleEditSave = useCallback(
    (text: string) => {
      if (!editTarget) return;
      void (async () => {
        try {
          await edit(editTarget.id, text);
          setEditTarget(null);
        } catch (e) {
          Alert.alert('Edit failed', e instanceof Error ? e.message : 'Try again.');
        }
      })();
    },
    [edit, editTarget],
  );

  const handleDelete = useCallback(
    (m: Message) => {
      Alert.alert('Delete message', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void remove(m.id).catch((e) =>
              Alert.alert('Delete failed', e instanceof Error ? e.message : 'Try again.'),
            );
          },
        },
      ]);
    },
    [remove],
  );

  const handleTogglePin = useCallback(
    (m: Message) => {
      void togglePin(m.id).catch((e) =>
        Alert.alert('Pin failed', e instanceof Error ? e.message : 'Try again.'),
      );
    },
    [togglePin],
  );

  const groupsFor = useCallback(
    (message: Message): ReactionGroup[] => {
      const list = reactionsByMessage[message.id] ?? [];
      const map = new Map<string, ReactionGroup>();
      for (const r of list) {
        const g = map.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
        g.count += 1;
        if (r.user_id === myId) g.mine = true;
        map.set(r.emoji, g);
      }
      return [...map.values()];
    },
    [reactionsByMessage, myId],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isNewest = index === 0;
      const isMine = item.sender_id === myId;
      const previous = data[index + 1]; // visually above this one
      const showDay = !previous || dayLabel(previous.created_at) !== dayLabel(item.created_at);
      const showSender = !isMine && (!previous || previous.sender_id !== item.sender_id);
      const seen =
        scope.kind === 'dm' && isMine && isNewest
          ? Boolean(partnerLastRead && partnerLastRead >= item.created_at)
          : undefined;
      return (
        <View>
          {showDay ? (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text
                style={{
                  color: C.textFaint,
                  fontSize: 11.5,
                  fontWeight: '700',
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                }}
              >
                {dayLabel(item.created_at)}
              </Text>
            </View>
          ) : null}
          <MessageBubble
            message={item}
            sender={memberById[item.sender_id]}
            isMine={isMine}
            showSender={showSender}
            replyTo={messages.find((m) => m.id === item.reply_to_id) ?? null}
            reactions={groupsFor(item)}
            seen={seen}
            onLongPress={() => setActionsFor(item)}
            onReactionPress={(emoji) => void toggleReaction(item.id, emoji)}
            usernames={usernames}
          />
        </View>
      );
    },
    [data, myId, scope.kind, partnerLastRead, memberById, messages, groupsFor, toggleReaction, usernames],
  );

  const lastMyMessageSeen =
    scope.kind === 'dm' &&
    data.length > 0 &&
    data[0].sender_id === myId &&
    Boolean(partnerLastRead && partnerLastRead >= data[0].created_at);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 6,
          paddingBottom: 10,
          paddingHorizontal: 6,
          backgroundColor: C.bgElevated,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={26} color={C.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: C.text, fontSize: 17, fontWeight: '800' }}>
            {title}
          </Text>
          <Text numberOfLines={1} style={{ color: C.textFaint, fontSize: 12, marginTop: 1 }}>
            {subtitle}
          </Text>
        </View>
        <Pressable onPress={() => setSearchOpen(true)} hitSlop={8} style={{ padding: 8 }}>
          <Ionicons name="search" size={22} color={C.textDim} />
        </Pressable>
        {isRoom && canPin(myRole) ? (
          <Pressable onPress={() => setPinnedOpen(true)} hitSlop={8} style={{ padding: 8 }}>
            <Ionicons name="bookmark" size={21} color={C.gold} />
          </Pressable>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <Spinner />
        ) : (
          <FlatList
            data={data}
            inverted
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            onEndReached={hasMore ? loadMore : undefined}
            onEndReachedThreshold={0.6}
            contentContainerStyle={{ paddingBottom: 10, paddingHorizontal: 0, flexGrow: 1 }}
            ListFooterComponent={
              loadingMore ? (
                <Spinner />
              ) : !hasMore ? (
                <View style={{ alignItems: 'center', paddingVertical: 18 }}>
                  <Text style={{ color: C.red, fontWeight: '800', letterSpacing: 1.2, fontSize: 13 }}>
                    ⛩ UCHIHA CLAN
                  </Text>
                  <Text style={{ color: C.textFaint, fontSize: 11.5, marginTop: 2 }}>
                    {tr.chat.pinnedTitle === 'Pinned message' ? 'Beginning of chat history' : 'ابتدای تاریخچه گفتگو'}
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                icon="⚔️"
                title="No messages yet"
                subtitle="Start the conversation — your clan is listening."
              />
            }
          />
        )}

        {/* Seen indicator (DM) */}
        {lastMyMessageSeen ? (
          <Text
            style={{
              color: C.textFaint,
              fontSize: 11,
              textAlign: 'right',
              paddingRight: 20,
              paddingBottom: 2,
            }}
          >
            Seen
          </Text>
        ) : null}

        {/* Typing indicator */}
        {typingNames.length > 0 ? (
          <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
            <Text style={{ color: C.textFaint, fontSize: 12.5, fontStyle: 'italic' }}>
              {typingNames.slice(0, 2).join(', ')}
              {typingNames.length > 2 ? ` +${typingNames.length - 2}` : ''}{' '}
              {typingNames.length === 1 ? 'is' : 'are'} typing…
            </Text>
          </View>
        ) : null}

        <Composer
          onSend={handleSend}
          onSendMedia={handleSendMedia}
          onEditSave={handleEditSave}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          editTarget={editTarget}
          onCancelEdit={() => setEditTarget(null)}
          onTyping={notifyTypingForMe}
          memberNames={memberProfiles}
        />
      </KeyboardAvoidingView>

      <MessageActionsModal
        visible={actionsFor !== null}
        message={actionsFor}
        isMine={actionsFor?.sender_id === myId}
        canModerate={isRoom && canModerate(myRole)}
        canPin={isRoom && canPin(myRole)}
        onClose={() => setActionsFor(null)}
        onReply={(m) => {
          setReplyTo(m);
          setEditTarget(null);
        }}
        onEdit={(m) => {
          setEditTarget(m);
          setReplyTo(null);
        }}
        onDelete={handleDelete}
        onReact={(m, emoji) => void toggleReaction(m.id, emoji)}
        onTogglePin={handleTogglePin}
      />
      <SearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} scope={scope} memberById={memberById} />
      <PinnedModal
        visible={pinnedOpen}
        onClose={() => setPinnedOpen(false)}
        pinned={pinnedMessages}
        memberById={memberById}
      />
    </View>
  );
}
