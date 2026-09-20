import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/avatar';
import { MediaBody } from '@/components/media-bubble';
import { t } from '@/i18n';
import { C, R } from '@/lib/theme';
import { clockTime } from '@/lib/time';
import type { Message, Profile } from '@/lib/types';

export interface ReactionGroup {
  emoji: string;
  count: number;
  mine: boolean;
}

function MentionText({ content, usernames }: { content: string; usernames: Set<string> }) {
  const parts = content.split(/(@[a-zA-Z0-9_]+|#\w+)/g);
  return (
    <Text style={{ color: C.text, fontSize: 15.5, lineHeight: 21 }}>
      {parts.map((part, i) => {
        const isMention = part.startsWith('@') && usernames.has(part.slice(1).toLowerCase());
        const isHashtag = part.startsWith('#') && part.length > 1;
        return (
          <Text
            key={i}
            style={
              isMention
                ? { color: C.red, fontWeight: '700', backgroundColor: C.redSoft }
                : isHashtag
                  ? { color: C.blue, fontWeight: '600' }
                  : undefined
            }
          >
            {part}
          </Text>
        );
      })}
    </Text>
  );
}

export const MessageBubble = memo(function MessageBubble({
  message,
  sender,
  isMine,
  showSender,
  replyTo,
  reactions,
  seen,
  onLongPress,
  onReactionPress,
  usernames,
}: {
  message: Message;
  sender?: Profile;
  isMine: boolean;
  showSender: boolean;
  replyTo?: Message | null;
  reactions: ReactionGroup[];
  seen?: boolean;
  onLongPress: () => void;
  onReactionPress: (emoji: string) => void;
  usernames: Set<string>;
}) {
  const tr = t();
  const timeColor = isMine ? 'rgba(255,255,255,0.55)' : C.textFaint;

  if (message.deleted_at) {
    return (
      <View style={{ paddingHorizontal: 14, marginVertical: 2 }}>
        <View
          style={{
            alignSelf: isMine ? 'flex-end' : 'flex-start',
            maxWidth: '78%',
            backgroundColor: C.bgCard,
            borderColor: C.border,
            borderWidth: 1,
            borderRadius: R.l,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: C.textFaint, fontStyle: 'italic', fontSize: 14 }}>
            {tr.chat.deleted}
          </Text>
        </View>
      </View>
    );
  }

  const mineBg = { backgroundColor: C.bubbleMine, borderColor: C.bubbleMineBorder };
  const otherBg = { backgroundColor: C.bubbleOther, borderColor: C.bubbleOtherBorder };
  const hasMedia = message.media_type != null && message.media_url != null;
  const hasText = message.content.length > 0;

  return (
    <View style={{ paddingHorizontal: 14, marginVertical: 2 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: isMine ? 'flex-end' : 'flex-start',
          gap: 8,
        }}
      >
        {!isMine && showSender ? (
          <Avatar url={sender?.avatar_url} name={sender?.display_name ?? '?'} size="s" />
        ) : null}
        <Pressable
          onLongPress={onLongPress}
          delayLongPress={350}
          style={({ pressed }) => [
            {
              maxWidth: '80%',
              borderRadius: 16,
              borderWidth: 1,
              paddingHorizontal: hasMedia && !hasText ? 6 : 12,
              paddingVertical: hasMedia && !hasText ? 6 : 8,
              opacity: pressed ? 0.85 : 1,
            },
            isMine ? mineBg : otherBg,
          ]}
        >
          {showSender && !isMine && sender ? (
            <Text style={{ color: C.red, fontWeight: '700', fontSize: 13, marginBottom: 2 }}>
              {sender.display_name}
            </Text>
          ) : null}

          {replyTo ? (
            <View
              style={{
                borderLeftWidth: 3,
                borderLeftColor: C.red,
                backgroundColor: 'rgba(0,0,0,0.25)',
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 5,
                marginBottom: 6,
              }}
            >
              <Text style={{ color: C.red, fontSize: 11.5, fontWeight: '700' }}>
                {isMine ? tr.common.you : (replyTo.sender?.display_name ?? replyTo.sender?.username ?? '')}
              </Text>
              <Text numberOfLines={2} style={{ color: C.textDim, fontSize: 12.5 }}>
                {replyTo.deleted_at
                  ? tr.chat.deleted
                  : replyTo.media_type && !replyTo.content
                    ? `📎 ${replyTo.media_type}`
                    : replyTo.content}
              </Text>
            </View>
          ) : null}

          {message.forwarded_from ? (
            <Text style={{ color: C.textDim, fontSize: 11.5, fontStyle: 'italic', marginBottom: 2 }}>
              ↪ {tr.chat.forwarded} · {message.forwarded_from}
            </Text>
          ) : null}

          {hasMedia ? <MediaBody msg={message} mine={isMine} /> : null}
          {hasText ? <MentionText content={message.content} usernames={usernames} /> : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <Text style={{ color: timeColor, fontSize: 10.5 }}>
              {clockTime(message.created_at)}
            </Text>
            {message.edited_at ? (
              <Text style={{ color: timeColor, fontSize: 10.5 }}>({tr.chat.edited})</Text>
            ) : null}
            {isMine && seen !== undefined ? (
              <Text style={{ color: seen ? '#4ADE80' : timeColor, fontSize: 10.5 }}>
                {seen ? tr.chat.seen : tr.chat.sent}
              </Text>
            ) : null}
            {message.pinned ? (
              <Text style={{ color: C.gold, fontSize: 10.5 }}>📌</Text>
            ) : null}
          </View>
        </Pressable>
      </View>

      {reactions.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 4,
            marginTop: 3,
            paddingLeft: isMine ? 0 : 36,
            justifyContent: isMine ? 'flex-end' : 'flex-start',
          }}
        >
          {reactions.map((group) => (
            <Pressable
              key={group.emoji}
              onPress={() => onReactionPress(group.emoji)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                backgroundColor: group.mine ? C.redSoft : C.bgCard,
                borderWidth: 1,
                borderColor: group.mine ? C.redBorder : C.border,
                borderRadius: 999,
                paddingHorizontal: 7,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 12 }}>{group.emoji}</Text>
              <Text style={{ color: group.mine ? C.red : C.textDim, fontSize: 11, fontWeight: '700' }}>
                {group.count}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
});
