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
