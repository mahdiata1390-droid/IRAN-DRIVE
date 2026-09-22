import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// Public configuration for the Supabase project. These values are publishable
// client-side credentials (protected by Row Level Security on the server).
const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const envKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const SUPABASE_URL = envUrl ?? 'https://hizjqkuacgotbooelitd.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY =
  envKey ?? 'sb_publishable_BZQVa1wpuo80SlWv4pZs1w_vyu5XjQ2';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 25 },
  },
});

/**
 * Reuse-safe channel topic resolution.
 *
 * `supabase.channel(topic)` returns the *existing* channel object when a channel
 * with the same topic is already registered. If that channel is joining/joined,
 * attaching `postgres_changes`/`presence` callbacks afterwards throws:
 *   "cannot add `postgres_changes` callbacks for realtime:<topic> after `subscribe()`."
 * This race happens when two components mount the same hook (e.g. the tabs
 * layout and the chats screen both using useChats), with StrictMode remounts,
 * and when web navigation remounts a screen before the previous channel's
 * removeChannel() finishes.
 *
 * - Default: keeps the semantic topic when free (so shared presence/broadcast
 *   topics like clan:online stay shared across users) and adds a random suffix
 *   only when the topic is still taken by a live channel.
 * - { unique: true }: always returns a fresh per-run topic, for fire-and-forget
 *   listeners where every mount legitimately needs its own channel.
 */
export function resolveChannelTopic(
  base: string,
  options: { unique?: boolean } = {},
): string {
  if (options.unique) return `${base}:${Math.random().toString(36).slice(2, 10)}`;
  const taken = supabase.getChannels().some((c) => c.topic === `realtime:${base}`);
  return taken ? `${base}:${Math.random().toString(36).slice(2, 10)}` : base;
}
