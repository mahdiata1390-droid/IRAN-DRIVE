import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, NativeModules, Platform } from 'react-native';
import { EN, type Translations } from '@/i18n/en';
import { FA } from '@/i18n/fa';

export type Lang = 'fa' | 'en';

const LANG_KEY = 'app.lang';

let lang: Lang = 'fa';
let dict: Translations = FA;

function isRtl(l: Lang): boolean {
  return l === 'fa';
}

export function t(): Translations {
  return dict;
}

export function currentLang(): Lang {
  return lang;
}

export function isRTL(): boolean {
  return isRtl(lang);
}

/** Translation lookup by dot path with {placeholder} substitution. */
export function tr(path: string, vars?: Record<string, string | number>): string {
  const parts = path.split('.');
  let node: unknown = dict;
  for (const p of parts) {
    if (node && typeof node === 'object' && p in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  let out = typeof node === 'string' ? node : path;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(`{${k}}`, String(v));
    }
  }
  return out;
}

/** Loads the stored preference and applies layout direction. */
export async function initI18n(): Promise<Lang> {
  try {
    const stored = (await AsyncStorage.getItem(LANG_KEY)) as Lang | null;
    if (stored === 'fa' || stored === 'en') lang = stored;
  } catch {
    // keep default
  }
  dict = lang === 'fa' ? FA : EN;
  applyDocumentDir();
  return lang;
}

function applyDocumentDir(): void {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', isRtl(lang) ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }
}

function reloadApp(): void {
  if (Platform.OS === 'web') {
    // Web needs a location reload; window isn't referenced at module scope so
    // this file stays SSR-safe.
    if (typeof window !== 'undefined') window.location?.reload();
    return;
  }
  // Native: layout direction only re-applies on a full JS reload.
  const DevMenu = NativeModules.DevMenu as { reload?: () => void } | undefined;
  if (DevMenu?.reload) {
    DevMenu.reload();
    return;
  }
  const ExpoUpdates = NativeModules.ExpoUpdates as { reload?: () => void } | undefined;
  if (ExpoUpdates?.reload) ExpoUpdates.reload();
}

/** Persists the language and reloads when the layout direction must flip. */
export async function setLang(next: Lang): Promise<void> {
  if (next === lang) return;
  lang = next;
  dict = next === 'fa' ? FA : EN;
  try {
    await AsyncStorage.setItem(LANG_KEY, next);
  } catch {
    // non-fatal
  }
  applyDocumentDir();
  const rtl = isRtl(next);
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
    reloadApp();
  }
}

export { FA, EN };
export type { Translations };
