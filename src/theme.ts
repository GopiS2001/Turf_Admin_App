import { Platform } from 'react-native';

/** 90s Turf brand — same palette as the website and web dashboard. */
export const colors = {
  navy: '#192335',
  navy900: '#0F1726',
  navy700: '#243049',
  navy500: '#3A4763',
  turf: '#097E52',
  turf600: '#076A45',
  turf50: '#E8F5EF',
  turfGlow: '#16A36D',
  accent: '#FFAA00',
  accentSoft: '#FFF4DB',
  bg: '#F4F5F1',
  surface: '#FFFFFF',
  line: '#E7E9EE',
  ink: '#192335',
  muted: '#6B7385',
  faint: '#9AA1B0',
  white: '#FFFFFF',
  red: '#DC2626',
  redSoft: '#FEF2F2',
  amber: '#B45309',
  amberSoft: '#FFFBEB',
  sky: '#0369A1',
  skySoft: '#F0F9FF',
  violet: '#6D28D9',
  violetSoft: '#F5F3FF',
  slate: '#475569',
  slateSoft: '#F1F5F9',
};

export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  display: 'BebasNeue_400Regular',
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

/** Soft card shadow that works on iOS, Android and web. */
export const shadow = Platform.select({
  web: { boxShadow: '0 1px 2px rgba(25,35,53,0.05), 0 10px 28px -14px rgba(25,35,53,0.22)' },
  default: {
    shadowColor: '#192335',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
}) as object;
