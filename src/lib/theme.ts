export const C_DARK = {
  bg: '#0A0A0B',
  bgElevated: '#131316',
  bgCard: '#17171B',
  surface: '#1E1E23',
  surfacePress: '#2A2A31',
  glass: 'rgba(17, 17, 22, 0.58)',
  glassStrong: 'rgba(18, 18, 23, 0.76)',
  glassHighlight: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.12)',
  border: '#26262C',
  borderStrong: '#34343C',
  text: '#F4F4F5',
  textDim: '#A1A1AA',
  textFaint: '#71717A',
  red: '#DC2626',
  redDark: '#991B1B',
  redSoft: 'rgba(220, 38, 38, 0.14)',
  redBorder: 'rgba(220, 38, 38, 0.35)',
  bubbleMine: '#7F1D1D',
  bubbleMineBorder: '#991B1B',
  bubbleOther: '#1E1E23',
  bubbleOtherBorder: '#2A2A31',
  online: '#22C55E',
  danger: '#EF4444',
  gold: '#F59E0B',
  purple: '#A78BFA',
  blue: '#60A5FA',
  teal: '#2DD4BF',
  overlay: 'rgba(0,0,0,0.6)',
  header: '#131316',
  input: '#17171B',
};

export const C_LIGHT = {
  bg: '#F7F6F5',
  bgElevated: '#FFFFFF',
  bgCard: '#FFFFFF',
  surface: '#F0EEEC',
  surfacePress: '#E5E2DF',
  glass: 'rgba(255,255,255,0.64)',
  glassStrong: 'rgba(255,255,255,0.82)',
  glassHighlight: 'rgba(255,255,255,0.55)',
  glassBorder: 'rgba(17,24,39,0.08)',
  border: '#E4E1DE',
  borderStrong: '#CFCBC7',
  text: '#1B1A1A',
  textDim: '#5C5A58',
  textFaint: '#928F8B',
  red: '#B91C1C',
  redDark: '#7F1D1D',
  redSoft: 'rgba(185, 28, 28, 0.10)',
  redBorder: 'rgba(185, 28, 28, 0.30)',
  bubbleMine: '#F6D8D8',
  bubbleMineBorder: '#EFC2C2',
  bubbleOther: '#FFFFFF',
  bubbleOtherBorder: '#E4E1DE',
  online: '#16A34A',
  danger: '#DC2626',
  gold: '#B45309',
  purple: '#7C3AED',
  blue: '#2563EB',
  teal: '#0D9488',
  overlay: 'rgba(0,0,0,0.35)',
  header: '#FFFFFF',
  input: '#FFFFFF',
};

export type Palette = typeof C_DARK;

let current: 'dark' | 'light' = 'dark';
let palette: Palette = { ...C_DARK };

export function setTheme(mode: 'dark' | 'light'): void {
  current = mode;
  palette = mode === 'dark' ? { ...C_DARK } : { ...C_LIGHT };
}

export function themeMode(): 'dark' | 'light' {
  return current;
}

/** Live theme palette — properties resolve against the active mode. */
export const C: Palette = new Proxy({ ...C_DARK }, {
  get(_t, prop: string) {
    return palette[prop as keyof Palette];
  },
});

export const R = { s: 6, m: 10, l: 16, xl: 24 } as const;

export const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.4,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
} as const;
