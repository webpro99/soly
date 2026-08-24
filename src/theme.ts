export type SceneName = 'immersive' | 'transactional' | 'editorial' | 'emergency';

export type Scene = {
  bg: string;
  bgDeep: string;
  bgDarker: string;
  bgBright: string;
  accentPrimary: string;
  accentSecondary: string;
  accentDeep: string;
  textPrimary: string;
  textMuted: string;
  textSecondary: string;
  surface: string;
  surfaceRaised: string;
  surfaceStrong: string;
  border: string;
  borderSoft: string;
};

export const scenes: Record<SceneName, Scene> = {
  immersive: {
    bg: '#134F32',
    bgDeep: '#0C3823',
    bgDarker: '#0A331F',
    bgBright: '#1F7148',
    accentPrimary: '#CFA055',
    accentSecondary: '#CFA055',
    accentDeep: '#CFA055',
    textPrimary: '#EFEAE0',
    textSecondary: '#BFC6BB',
    textMuted: 'rgba(239,234,224,0.74)',
    surface: 'rgba(207,160,85,0.035)',
    surfaceRaised: 'rgba(207,160,85,0.07)',
    surfaceStrong: 'rgba(207,160,85,0.12)',
    border: 'rgba(207,160,85,0.30)',
    borderSoft: 'rgba(207,160,85,0.16)',
  },
  transactional: {
    bg: '#EFEAE0',
    bgDeep: '#DCD2BF',
    bgDarker: '#CFC2AB',
    bgBright: '#F7F3EA',
    accentPrimary: '#CFA055',
    accentSecondary: '#CFA055',
    accentDeep: '#CFA055',
    textPrimary: '#1F3A2E',
    textSecondary: '#5E665E',
    textMuted: 'rgba(31,58,46,0.72)',
    surface: '#F7F3EA',
    surfaceRaised: '#FFFFFF',
    surfaceStrong: 'rgba(31,58,46,0.04)',
    border: '#DCD2BF',
    borderSoft: 'rgba(31,58,46,0.10)',
  },
  editorial: {
    bg: '#161412',
    bgDeep: '#0D0C0B',
    bgDarker: '#0A0908',
    bgBright: '#1F1C18',
    accentPrimary: '#CFA055',
    accentSecondary: '#CFA055',
    accentDeep: '#CFA055',
    textPrimary: '#F5EFE3',
    textSecondary: 'rgba(245,239,227,0.75)',
    textMuted: 'rgba(245,239,227,0.72)',
    surface: 'rgba(239,234,224,0.04)',
    surfaceRaised: 'rgba(239,234,224,0.08)',
    surfaceStrong: 'rgba(239,234,224,0.14)',
    border: 'rgba(207,160,85,0.24)',
    borderSoft: 'rgba(207,160,85,0.14)',
  },
  emergency: {
    bg: '#0C3823',
    bgDeep: '#071F15',
    bgDarker: '#0A331F',
    bgBright: '#1A4D32',
    accentPrimary: '#CF8076',
    accentSecondary: '#CFA055',
    accentDeep: '#9A3D32',
    textPrimary: '#F5EFE3',
    textSecondary: '#E9D5B8',
    textMuted: '#C9B89A',
    surface: 'rgba(207,128,118,0.08)',
    surfaceRaised: 'rgba(207,128,118,0.14)',
    surfaceStrong: 'rgba(207,128,118,0.22)',
    border: 'rgba(207,128,118,0.34)',
    borderSoft: 'rgba(207,128,118,0.18)',
  },
};

export const type = {
  serif: 'CormorantGaramond_600SemiBold',
  display: 'Marcellus_400Regular',
  body: 'Jost_400Regular',
  bodyMedium: 'Jost_500Medium',
  bodyBold: 'Jost_700Bold',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 34,
};
