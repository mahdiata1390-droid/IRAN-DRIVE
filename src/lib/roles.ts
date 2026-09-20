import type { ClanRole } from './types';
import { C } from './theme';

export const ROLE_ORDER: ClanRole[] = ['owner', 'leader', 'co_leader', 'moderator', 'member'];

export function roleRank(role: ClanRole | null | undefined): number {
  switch (role) {
    case 'owner':
      return 5;
    case 'leader':
      return 4;
    case 'co_leader':
      return 3;
    case 'moderator':
      return 2;
    case 'member':
      return 1;
    default:
      return 0;
  }
}

export const ROLE_META: Record<ClanRole, { label: string; color: string }> = {
  owner: { label: 'Owner', color: C.gold },
  leader: { label: 'Leader', color: C.red },
  co_leader: { label: 'Co-Leader', color: C.purple },
  moderator: { label: 'Moderator', color: C.blue },
  member: { label: 'Member', color: C.textDim },
};

export function roleLabel(role: ClanRole): string {
  return ROLE_META[role]?.label ?? 'Member';
}

export function roleColor(role: ClanRole): string {
  return ROLE_META[role]?.color ?? C.textDim;
}

/** Whether the user can delete other people's messages in clan rooms. */
export function canModerate(role: ClanRole): boolean {
  return roleRank(role) >= 2;
}

/** Whether the user can pin messages in clan rooms. */
export function canPin(role: ClanRole): boolean {
  return roleRank(role) >= 2;
}

/** Whether the user can create new rooms. */
export function canCreateRooms(role: ClanRole): boolean {
  return roleRank(role) >= 3;
}

/** Server-side rules mirrored for UI: can `actorRole` assign `newRole` to someone with `targetRole`? */
export function canAssignRole(actorRole: ClanRole, targetRole: ClanRole, newRole: ClanRole): boolean {
  const a = roleRank(actorRole);
  const t = roleRank(targetRole);
  if (a <= t) return false; // cannot modify equal or higher rank
  if (newRole === 'member' || newRole === 'moderator') return a >= 3;
  if (newRole === 'co_leader') return a >= 4;
  return false; // owner/leader assignment is Owner-only
}
