# UCHIHA Clan — Mobile Messenger

A private, production-grade messaging app for the **UCHIHA** Call of Duty Mobile clan, built as a **real native mobile application** with **Expo (React Native)** — not a website, not a PWA, not a WebView wrapper.

- **Platform targets:** iOS + Android (native builds via [EAS Build](https://docs.expo.dev/build/introduction/))
- **Stack:** Expo SDK 57 · React Native 0.86 · expo-router · TypeScript · Supabase (Postgres, Auth, Realtime, Storage)
- **Preview:** web preview runs via `bunx expo start --web` (the phone apps are the real product)

---

## Features

| Area | What's included |
| --- | --- |
| Auth | Sign up, login, logout, forgot/reset password, persistent sessions, protected screens |
| Profiles | Username, display name, avatar (upload), bio, COD Mobile UID, clan role, online status, last seen, join date |
| Roles | Owner → Leader → Co-Leader → Moderator → Member, **enforced by Postgres RLS**, not just UI |
| DMs | Real-time 1-to-1 messaging, replies, edit, delete, reactions, typing indicator, read receipts, search, pagination |
| Clan chat | Official clan-wide room with mentions (@username), pins, moderation controls |
| Rooms | Clan groups (General, War Room, Ranked, Multiplayer, …) created by Owner/Leader/Co-Leader |
| Realtime | Supabase Realtime for messages, typing, presence, read receipts, unread badges |
| Notifications | Push registration + foreground handling (Android FCM / iOS APNs via EAS) |
| Storage | Supabase bucket `avatars` for profile photos |

Every feature is enforced server-side in [`supabase/schema.sql`](supabase/schema.sql) (RLS policies, triggers, RPCs).

---

## 1. Backend setup (one time, ~2 minutes)

The app talks to a Supabase project. Credentials are already wired in `src/lib/supabase.ts` and overridable with `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Apply the database schema:

1. Open your project at [supabase.com/dashboard](https://supabase.com/dashboard) → project `hizjqkuacgotbooelitd`.
2. Go to **SQL Editor** → **New query**.
3. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.

This creates: tables (`profiles`, `rooms`, `room_members`, `messages`, `dm_conversations`, `message_reactions`, `read_receipts`, `typing_state`, `blocked_users`), Row Level Security for every table, triggers (profile auto-creation, role changes), RPCs (start DM, mark read, unread counts), realtime publication, and the `avatars` storage bucket.

> **First user = Owner.** The first profile created is granted the `owner` role and can promote everyone else from the Members tab. Everyone else joins as `member`.

---

## 2. Run on your phone (development)

```bash
bun install
bun start            # or: bunx expo start
```

Then:

- **Android:** install *Expo Go* from the Play Store → scan the QR code in the terminal.
- **iOS:** install *Expo Go* from the App Store → scan the QR code (or press `i` for the iOS simulator on a Mac).

You will get the real native app experience (gestures, keyboard, haptics, notifications) instantly.

---

## 3. Production builds (real installable apps)

Install the EAS CLI once:

```bash
bunx eas-cli login          # sign in with your Expo account (free)
```

### Android (APK / AAB)

```bash
bunx eas-cli build -p android --profile preview      # installable APK for the clan
bunx eas-cli build -p android --profile production   # AAB for Google Play
```

The first Android build works with zero extra setup. When the build finishes, EAS gives you a download link — send the APK to clan members and install it.

### iOS

```bash
bunx eas-cli build -p ios --profile production
```

iOS requires one of:

- **Apple Developer account** ($99/yr) — EAS handles signing; run `bunx eas-cli credentials` if it asks.
- Or **TestFlight**: same build, then `bunx eas-cli submit -p ios` with your App Store Connect API key.

### Push notifications (optional but recommended)

To receive push notifications, add credentials with:

```bash
bunx eas-cli credentials          # Android: FCM key · iOS: APNs key (.p8)
```

Then rebuild. `expo-notifications` is already integrated in `src/app/_layout.tsx`.

---

## 4. Updating the clan app after release

```bash
bunx eas-cli update                # OTA update: new JS instantly reaches all installed apps
```

Native changes (new permissions, plugins) need a new store/APK build.

---

## Project structure

```
src/
  app/                    # expo-router routes
    (auth)/               # welcome, login, sign-up, check-email
    (tabs)/               # chats, members, profile
    room/[id] dm/[id]     # chat screens
    member/[id]           # member detail / moderation
    new-room.tsx          # create room
    edit-profile.tsx      # edit profile
  components/             # Avatar, RoleBadge, MessageBubble, Composer, UI primitives
  features/chat/          # shared chat experience + modals (reactions, pins, search)
  hooks/                  # useMessages (realtime), useChats, useMembers, useRequireAuth
  providers/              # session + presence provider
  lib/                    # supabase client, theme, roles, types, time helpers
supabase/
  schema.sql              # complete backend: tables, RLS, triggers, RPCs, storage
```

## Roles & permissions (server-enforced)

| Action | Member | Moderator | Co-Leader | Leader | Owner |
| --- | --- | --- | --- | --- | --- |
| Send/react/edit own messages | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete own messages | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete any message | — | ✅ | ✅ | ✅ | ✅ |
| Pin messages | — | ✅ | ✅ | ✅ | ✅ |
| Create rooms | — | — | ✅ | ✅ | ✅ |
| Change roles / moderate members | — | — | — | ✅ | ✅ |
| Transfer ownership | — | — | — | — | ✅ |

## Troubleshooting

- **"Could not find the table 'public.profiles'"** → you haven't run `supabase/schema.sql` yet (see step 1).
- **Stuck on welcome screen after login** → make sure email confirmation is disabled or confirmed: Supabase Dashboard → Auth → Providers → Email.
- **Reset password email goes to the wrong page** → set Site URL in Supabase Dashboard → Auth → URL Configuration to your reset screen URL.
