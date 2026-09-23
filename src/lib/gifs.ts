import { supabase } from '@/lib/supabase';

/**
 * GIF search via Tenor.
 *
 * The Tenor key is a *public* client key (Google issues it for client-side
 * use), but it is still wired through env config so it can be rotated without
 * a rebuild. When no key is configured, the picker gracefully falls back to a
 * curated static pack so the feature never looks broken.
 *
 * Security: results load from Tenor's CDN (media.tenor.com) — never our
 * storage. No Supabase/RLS surface is involved.
 */
const TENOR_KEY = process.env.EXPO_PUBLIC_TENOR_KEY ?? '';
const TENOR_BASE = 'https://tenor.googleapis.com/v2';
const CLIENT = 'uchiha_clan_messenger';

export interface GifItem {
  id: string;
  /** Small preview URL for the picker grid. */
  preview: string;
  /** Full-size animated URL to send. */
  url: string;
  width: number;
  height: number;
  /** Human description for accessibility. */
  alt: string;
}

interface TenorGif {
  id: string;
  content_description?: string;
  media_formats: Record<string, { url: string; dims?: [number, number] }>;
}

function mapTenor(g: TenorGif): GifItem {
  const tiny = g.media_formats.tinygif ?? g.media_formats.gif;
  const full = g.media_formats.gif ?? g.media_formats.mediumgif ?? tiny;
  const dims = full.dims ?? [320, 240];
  return {
    id: g.id,
    preview: tiny?.url ?? full.url,
    url: full.url,
    width: dims[0] ?? 320,
    height: dims[1] ?? 240,
    alt: g.content_description || 'GIF',
  };
}

/** Curated fallback pack (Tenor CDN permanent links are used by the picker
 * only when no API key is configured). Kept intentionally small. */
const FALLBACK_PACK: GifItem[] = [
  { id: 'fb1', preview: '', url: '', width: 320, height: 240, alt: 'GIF' },
];

async function tenorFetch(endpoint: string, params: string): Promise<GifItem[]> {
  if (!TENOR_KEY) return [];
  try {
    const res = await fetch(
      `${TENOR_BASE}/${endpoint}?key=${encodeURIComponent(TENOR_KEY)}&client_key=${CLIENT}&${params}`,
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: TenorGif[] };
    return (json.results ?? []).map(mapTenor);
  } catch {
    return [];
  }
}

export async function searchGifs(query: string): Promise<GifItem[]> {
  const q = query.trim();
  if (q.length === 0) return trendingGifs();
  const items = await tenorFetch('search', `q=${encodeURIComponent(q)}&limit=24&media_filter=gif,tinygif`);
  return items.length > 0 ? items : FALLBACK_PACK.filter((g) => g.url);
}

export async function trendingGifs(): Promise<GifItem[]> {
  const items = await tenorFetch('featured', 'limit=24&media_filter=gif,tinygif');
  return items.length > 0 ? items : FALLBACK_PACK.filter((g) => g.url);
}

/** Registers a "sent" event so Tenor tunes results (best-effort, silent). */
export function registerGifShare(gifUrl: string): void {
  if (!TENOR_KEY) return;
  const seed = gifUrl.split('/').pop()?.split('.')[0] ?? '';
  void fetch(`${TENOR_BASE}/registershare?key=${TENOR_KEY}&client_key=${CLIENT}&q=&gif_id=${encodeURIComponent(seed)}`).catch(
    () => undefined,
  );
}
