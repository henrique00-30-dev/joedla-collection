import { Platform } from 'react-native';

function themeColor(variable: string, fallback: string) {
  return Platform.OS === 'web' ? `var(${variable}, ${fallback})` : fallback;
}

export const colors = {
  background: themeColor('--joedla-background', '#FFFDF9'),
  surface: themeColor('--joedla-surface', '#FFFFFF'),
  surfaceWarm: themeColor('--joedla-surface-warm', '#F8F0E6'),
  primary: themeColor('--joedla-primary', '#875019'),
  primaryDark: themeColor('--joedla-primary-dark', '#63360E'),
  primarySoft: themeColor('--joedla-primary-soft', '#E7CFB4'),
  gold: themeColor('--joedla-gold', '#B37B2E'),
  text: themeColor('--joedla-text', '#332A24'),
  textMuted: themeColor('--joedla-text-muted', '#756D67'),
  border: themeColor('--joedla-border', '#E9E0D7'),
  success: themeColor('--joedla-success', '#2E7D55'),
  successSoft: themeColor('--joedla-success-soft', '#E8F5EC'),
  warning: themeColor('--joedla-warning', '#A96713'),
  warningSoft: themeColor('--joedla-warning-soft', '#FFF4DC'),
  danger: themeColor('--joedla-danger', '#B33A3A'),
  dangerSoft: themeColor('--joedla-danger-soft', '#FDECEC'),
  info: themeColor('--joedla-info', '#496E91'),
  infoSoft: themeColor('--joedla-info-soft', '#EAF2F8'),
  white: themeColor('--joedla-white', '#FFFFFF'),
  black: themeColor('--joedla-black', '#17130F'),
  overlay: themeColor('--joedla-overlay', 'rgba(31, 22, 14, 0.42)'),
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

const shadowBase = {
  shadowColor: Platform.OS === 'web' ? 'var(--joedla-black, #17130F)' : '#2D2116',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
};

// `card` não é enumerável: `...shadow` continua gerando apenas propriedades
// válidas de estilo, enquanto componentes podem reutilizar `shadow.card`.
export const shadow = Object.defineProperty(
  { ...shadowBase },
  'card',
  { value: { ...shadowBase }, enumerable: false },
) as typeof shadowBase & { card: typeof shadowBase };
