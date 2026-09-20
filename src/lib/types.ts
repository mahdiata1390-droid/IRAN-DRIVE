export type ClanRole = 'owner' | 'leader' | 'co_leader' | 'moderator' | 'member';
export type MediaKind = 'image' | 'video' | 'audio' | 'voice' | 'file' | 'sticker';

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
  media_type: MediaKind | null;
  media_url: string | null;
  media_name: string | null;
  media_size: number | null;
  media_duration_ms: number | null;
  media_waveform: number[] | null;
  forwarded_from: string | null;
  hashtag: string | null;
  sender?: Profile;
  reply_to?: Pick<Message, 'id' | 'content' | 'deleted_at' | 'media_type'> & {
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
  type: 'dm' | 'mention' | 'friend_request' | 'role_change' | 'announcement';
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

export interface FriendRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: ClanRole;
  last_seen: string;
  friends_since: string;
}

export interface FriendRequestRow {
  id: string;
  from_user: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface ReportRow {
  id: string;
  reporter: string;
  target_user: string | null;
  message_id: string | null;
  room_id: string | null;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
  reporter_profile?: Pick<Profile, 'display_name' | 'username'> | null;
  target_profile?: Pick<Profile, 'display_name' | 'username'> | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: 'normal' | 'important' | 'critical';
  pinned: boolean;
  author: string;
  created_at: string;
  author_profile?: Pick<Profile, 'display_name' | 'username'> | null;
}

export interface WarEvent {
  id: string;
  title: string;
  opponent: string;
  starts_at: string;
  teams: { name: string; players: string[] }[];
  result: 'win' | 'loss' | 'draw' | null;
  score: string | null;
  notes: string | null;
  created_at: string;
}
