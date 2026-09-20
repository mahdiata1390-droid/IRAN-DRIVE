# UCHIHA Clan — Mobile Messenger

A private, production-grade messaging app for the **UCHIHA** Call of Duty Mobile clan, built as a **real native mobile application** with **Expo (React Native)** — iOS + Android.

- **Stack:** Expo SDK 57 · React Native 0.86 · expo-router · TypeScript · Supabase (Postgres, Auth, Realtime, Storage)
- **Auth:** **Username + password** (secure Supabase Auth; passwords are hashed by Supabase, never stored or exposed by the app)
- **Languages:** 🇮🇷 Persian (default, full RTL) + 🇬🇧 English — switchable in Profile → Settings
- **Themes:** Premium dark UCHIHA theme (default) + light theme

---

## Features

| Area | What's included |
| --- | --- |
| Auth | Username/password registration + login, uniqueness + strength validation, confirm-password, auto-login, session persistence, logout |
| Messaging | DMs, group rooms, official clan chat; replies, edit, delete, forward, reactions, emoji, built-in stickers, mentions, hashtags, pins, message search, chat search, unread counts, read receipts, timestamps, typing indicators, presence, last seen, drafts |
| Media | Photos, videos, documents, audio — upload **with progress + cancel**, tap to open, size validation (50 MB), signed private URLs |
| Voice messages | In-chat recording with live waveform, cancel, playback with seek + duration, mic permission handling |
| Groups | Room membership with room-level roles; leaders manage info, promote/demote, remove members |
| Announcements | Official channel — Title/body/priority (normal/important/critical)/pinned; only Leader+ can publish |
| Clan War | Match scheduling, opponent, results (win/loss/draw), history — managed by leaders |
| Friends | Requests (send/accept/reject), friend list with online status, start chat, remove |
| Global search | Users, rooms, messages — privacy-respecting via a security-definer RPC |
| Notifications | Push registration, in-app unread badges, deep-link taps into the exact chat |
| Chat settings | Pin, mute, favorite, archive, clear, drafts — long-press any chat row |
| Moderation | Reports (users/messages/rooms), mod review queue, mute/ban — all enforced server-side |
| Realtime | Messages, reactions, typing, presence, read receipts, friend requests — live via Supabase |

---

## 1. Backend setup (one time)

Credentials are wired in `src/lib/supabase.ts` (overridable via `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) → project `hizjqkuacgotbooelitd`.
2. **SQL Editor → New query**:
   - If starting fresh: run [`supabase/schema.sql`](supabase/schema.sql) **first**, then
   - run [`supabase/schema-v2.sql`](supabase/schema-v2.sql) (additive migration: friends, reports, chat settings, room members, announcements, war, media columns, mute/ban, global search).
   - Both files are idempotent — safe to re-run. No existing data is deleted.
3. **Storage:** the v2 migration expects a **private** bucket named `media`:
   Dashboard → Storage → New bucket → name `media`, **Public = OFF**.
   (The `avatars` bucket from schema.sql is public and still used for profile photos.)
4. **Auth → Providers → Email**: keep enabled (used internally with synthetic
   `<username>@users.uchiha-messenger.com` addresses — users never see email). Disable
   "Confirm email" so registration logs in immediately.

### First user = Owner
Sign up, then Profile → **Claim Ownership** (one-time; the first member to claim leads UCHIHA).

---

## 2. Run on your phone (development)

```bash
bun install
bun start            # or: bunx expo start
```

- **Android:** *Expo Go* from the Play Store → scan the QR code.
- **iOS:** *Expo Go* from the App Store → scan the QR code (or press `i` on a Mac).

---

## 3. Production builds (real installable apps)

```bash
bunx eas-cli login
bunx eas-cli build -p android --profile preview      # installable APK
bunx eas-cli build -p android --profile production   # Play Store AAB
bunx eas-cli build -p ios --profile production       # needs Apple Developer account
bunx eas-cli update                                  # OTA JS update after release
```

Push notifications require credentials: `bunx eas-cli credentials` (Android FCM key / iOS APNs .p8), then rebuild. All notification types (messages, mentions, replies, friend requests, announcements, role changes) are stored in the `notifications` table and delivered via push once configured.

---

## Internationalization (fa/en)

- Dictionary-per-language under `src/i18n/` (`fa.ts`, `en.ts`); components call `t()` — **no hardcoded UI strings**.
- Persian is the **default** language; selecting it flips the whole layout to **RTL** via `I18nManager.forceRTL` + app reload; English returns to LTR.
- Chat bubbles, lists, and forms align correctly in both directions; dates/numbers render with locale-appropriate formatting.

## Security model

- Passwords: handled exclusively by Supabase Auth (bcrypt server-side). The client never sees hashes; no plaintext is ever stored.
- Authorization: every table is RLS-protected; role checks run in Postgres (`role_rank()`, `is_mod()`, room-role helpers). Mute/ban/report actions are security-definer RPCs that verify rank server-side — **client UI hiding is never the security boundary**.
- Media: uploaded to a **private** `media` bucket under per-user folders; messages carry 1-hour signed URLs, so files are not publicly enumerable.
- Search: `global_search()` is a security-definer function returning only usernames/display names/room names/message previews from rooms (DM contents are not exposed).
- Moderation state (`user_moderation`) is readable only by the affected user and moderators.

## Project structure

```
src/
  app/                    # expo-router routes
    (auth)/               # welcome, login (username+password), sign-up
    (tabs)/               # chats, friends, members, war, profile
    dm/[id] room/[id]     # chat screens
    room-info.tsx         # group management
    announcements.tsx     # clan announcement channel
    admin.tsx             # moderation panel (reports, mute, ban)
    search.tsx            # global search
    edit-profile.tsx new-room.tsx
  components/             # bubbles, composer, voice player, media renderer, UI kit
  features/chat/          # shared chat experience + modals
  hooks/                  # useMessages, useChats, useFriends, useSocial, useChatSettings, useVoiceRecorder
  providers/              # session + presence
  i18n/                   # fa.ts, en.ts, runtime (RTL switching)
  lib/                    # supabase, theme (dark/light), media, roles, types, time
supabase/
  schema.sql              # base backend
  schema-v2.sql           # additive v2 migration
```

## Roles & permissions (server-enforced)

| Action | Member | Moderator | Co-Leader | Leader | Owner |
| --- | --- | --- | --- | --- | --- |
| Send/react/edit own messages | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete any room message / pin | — | ✅ | ✅ | ✅ | ✅ |
| Mute users | — | ✅ | ✅ | ✅ | ✅ |
| Ban users | — | — | ✅ | ✅ | ✅ |
| Create rooms / publish announcements | — | — | ✅ | ✅ | ✅ |
| Change clan roles | — | — | — | ✅ | ✅ |
| Transfer ownership | — | — | — | — | ✅ |

## Testing status

Verified in this environment: TypeScript checks pass; the app bundle compiles and serves with all new screens/features present; Supabase REST rejects unauthenticated access correctly.

**Not yet run end-to-end against a live database** (requires you to apply the two SQL files + create the `media` bucket): registration, login, messaging, media upload, voice, friends, reports, war/announcements flows, and the RTL flip on a physical device. The preview (web build of the same native code) renders the auth screens and chats UI.

## Troubleshooting

- **"Table not found" / RPC errors** → run `schema.sql` then `schema-v2.sql` (SQL Editor).
- **Upload fails "Bucket not found"** → create the private `media` bucket (step 1.3).
- **Registration says username taken** → usernames are unique; pick another.
- **Language switch looks mixed until restart** → the RTL flip applies on reload; tap the language again if the native layout didn't refresh.
