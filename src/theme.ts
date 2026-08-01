import { Platform } from 'react-native';

export const colors = {
  background: '#FFFDF9',
  surface: '#FFFFFF',
  surfaceWarm: '#F8F0E6',
  primary: '#875019',
  primaryDark: '#63360E',
  primarySoft: '#E7CFB4',
  gold: '#B37B2E',
  text: '#332A24',
  textMuted: '#756D67',
  border: '#E9E0D7',
  success: '#2E7D55',
  successSoft: '#E8F5EC',
  warning: '#A96713',
  warningSoft: '#FFF4DC',
  danger: '#B33A3A',
  dangerSoft: '#FDECEC',
  info: '#496E91',
  infoSoft: '#EAF2F8',
  white: '#FFFFFF',
  black: '#17130F',
  overlay: 'rgba(31, 22, 14, 0.42)',
};

export const radii = {
  small: 10,
  medium: 16,
  large: 22,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const fonts = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  body: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
};

export const shadow = {
  shadowColor: '#2D2116',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};
