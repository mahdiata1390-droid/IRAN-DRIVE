export const C = {
  bg: '#0A0A0B',
  bgElevated: '#131316',
  bgCard: '#17171B',
  surface: '#1E1E23',
  surfacePress: '#2A2A31',
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
} as const;

export const R = { s: 6, m: 10, l: 16, xl: 24 } as const;

export const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.4,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
} as const;
