export type ClanRole = 'owner' | 'leader' | 'co_leader' | 'moderator' | 'member';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  cod_uid: string | null;
  role: ClanRole;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  kind: 'clan' | 'room';
  created_by: string | null;
  created_at: string;
}

export interface DmListItem {
  conversation_id: string;
  other_id: string;
  other_display_name: string;
  other_username: string;
  other_avatar: string | null;
  last_message: string | null;
  last_at: string | null;
  last_sender: string | null;
  unread: number;
  other_last_read: string | null;
}

export interface UnreadRow {
  room_id: string | null;
  conversation_id: string | null;
  unread: number;
  last_activity: string | null;
}

export interface Message {
  id: string;
  room_id: string | null;
  conversation_id: string | null;
  sender_id: string;
  content: string;
  reply_to_id: string | null;
  mentions: string[];
  pinned: boolean;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  sender?: Profile;
  reply_to?: Pick<Message, 'id' | 'content' | 'sender_id' | 'deleted_at'> & {
    sender?: Pick<Profile, 'display_name' | 'username'>;
  };
}

export interface Reaction {
  message_id: string;
  user_id: string;
  emoji: string;
}

export interface ClanNotification {
  id: string;
  user_id: string;
  type: 'dm' | 'mention';
  title: string;
  body: string;
  conversation_id: string | null;
  room_id: string | null;
  message_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface PushToken {
  user_id: string;
  token: string;
  platform: string;
}
