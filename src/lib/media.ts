import { supabase, SUPABASE_URL as SUPABASE_PROJECT_URL } from '@/lib/supabase';

export const MAX_MEDIA_BYTES = 50 * 1024 * 1024; // 50 MB

export type MediaKind = 'image' | 'video' | 'audio' | 'voice' | 'file' | 'sticker';

const FOLDER: Record<MediaKind, string> = {
  image: 'images',
  video: 'videos',
  audio: 'audio',
  voice: 'voice',
  file: 'files',
  sticker: 'stickers',
};

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  aac: 'audio/aac',
  wav: 'audio/wav',
  pdf: 'application/pdf',
  txt: 'text/plain',
  zip: 'application/zip',
};

export interface UploadResult {
  url: string;
  bytes: number;
}

/**
 * Uploads a local file URI to the private `media` bucket under
 * `<userId>/<kind>/…` and returns its signed URL (1 hour) for sending.
 */
export async function uploadMedia(
  uri: string,
  kind: MediaKind,
  opts?: {
    onProgress?: (bytesSent: number, totalBytes: number) => void;
    signal?: { aborted: boolean };
    contentType?: string;
  },
): Promise<UploadResult> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Not signed in');

  const res = await fetch(uri);
  const blob = await res.blob();
  if (blob.size > MAX_MEDIA_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }

  const extGuess =
    uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? '';
  const ext = CONTENT_TYPES[extGuess] ? extGuess : 'bin';
  const contentType = opts?.contentType ?? CONTENT_TYPES[ext] ?? 'application/octet-stream';
  const path = `${userId}/${FOLDER[kind]}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  // XMLHttpRequest gives us real upload progress + abort support, which the
  // supabase-js postgrest path does not expose for storage uploads.
  const url = `${SUPABASE_PROJECT_URL}/storage/v1/object/media/${path}`;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Not signed in');

  const bytes = await new Promise<number>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts?.onProgress?.(e.loaded, e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(blob.size);
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    if (opts?.signal) {
      const check = setInterval(() => {
        if (opts.signal!.aborted) {
          xhr.abort();
          clearInterval(check);
          reject(new Error('CANCELLED'));
        }
      }, 200);
      xhr.onloadend = () => clearInterval(check);
    }
    xhr.send(blob);
  });

  const { data: signed, error: signErr } = await supabase.storage
    .from('media')
    .createSignedUrl(path, 3600);
  if (signErr || !signed) throw signErr ?? new Error('Signing failed');

  return { url: signed.signedUrl, bytes };
}

/** Resigns a stored path for display. */
export async function signMediaPath(path: string, seconds = 3600): Promise<string> {
  const { data } = await supabase.storage.from('media').createSignedUrl(path, seconds);
  return data?.signedUrl ?? '';
}

/** Extracts the storage path from a previously signed URL. */
export function mediaPathFromUrl(url: string): string | null {
  const marker = '/storage/v1/object/sign/media/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
}

/** Validates an acceptable media kind from a MIME type. */
export function kindFromMime(mime: string | undefined | null, fallback: MediaKind = 'file'): MediaKind {
  if (!mime) return fallback;
  if (mime.startsWith('image/')) return mime === 'image/gif' ? 'sticker' : 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
}
