import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { getStoredJson, setStoredJson } from '@/src/lib/storage';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'joedla.theme-preference.v1';

const lightVariables: Record<string, string> = {
  '--joedla-background': '#FFFDF9',
  '--joedla-surface': '#FFFFFF',
  '--joedla-surface-warm': '#F8F0E6',
  '--joedla-primary': '#875019',
  '--joedla-primary-dark': '#63360E',
  '--joedla-primary-soft': '#E7CFB4',
  '--joedla-gold': '#B37B2E',
  '--joedla-text': '#332A24',
  '--joedla-text-muted': '#756D67',
  '--joedla-border': '#E9E0D7',
  '--joedla-success': '#2E7D55',
  '--joedla-success-soft': '#E8F5EC',
  '--joedla-warning': '#A96713',
  '--joedla-warning-soft': '#FFF4DC',
  '--joedla-danger': '#B33A3A',
  '--joedla-danger-soft': '#FDECEC',
  '--joedla-info': '#496E91',
  '--joedla-info-soft': '#EAF2F8',
  '--joedla-white': '#FFFFFF',
  '--joedla-black': '#17130F',
  '--joedla-overlay': 'rgba(31, 22, 14, 0.42)',
};

const darkVariables: Record<string, string> = {
  '--joedla-background': '#0D1113',
  '--joedla-surface': '#141A1D',
  '--joedla-surface-warm': '#1C2428',
  '--joedla-primary': '#D58B32',
  '--joedla-primary-dark': '#E7A654',
  '--joedla-primary-soft': '#4A3520',
  '--joedla-gold': '#E0A954',
  '--joedla-text': '#F4EFE8',
  '--joedla-text-muted': '#B8B0A8',
  '--joedla-border': '#30393E',
  '--joedla-success': '#53C687',
  '--joedla-success-soft': '#163326',
  '--joedla-warning': '#E4A84B',
  '--joedla-warning-soft': '#382B18',
  '--joedla-danger': '#F07171',
  '--joedla-danger-soft': '#3B1F22',
  '--joedla-info': '#7BB5E6',
  '--joedla-info-soft': '#1D3040',
  '--joedla-white': '#FFFFFF',
  '--joedla-black': '#080A0B',
  '--joedla-overlay': 'rgba(0, 0, 0, 0.64)',
};

const legacyBackgrounds: Record<string, string> = {
  'rgb(255, 254, 252)': 'var(--joedla-surface)',
  'rgb(255, 253, 249)': 'var(--joedla-background)',
  'rgb(251, 248, 244)': 'var(--joedla-background)',
  'rgb(248, 240, 230)': 'var(--joedla-surface-warm)',
  'rgb(247, 241, 234)': 'var(--joedla-surface-warm)',
  'rgb(247, 239, 230)': 'var(--joedla-surface-warm)',
  'rgb(255, 247, 234)': 'var(--joedla-surface-warm)',
};

const legacyTextColors: Record<string, string> = {
  'rgb(139, 69, 28)': 'var(--joedla-primary)',
};

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyWebTheme(theme: ResolvedTheme) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const root = document.documentElement;
  const variables = theme === 'dark' ? darkVariables : lightVariables;
  Object.entries(variables).forEach(([name, value]) => root.style.setProperty(name, value));
  root.dataset.joedlaTheme = theme;
  root.style.colorScheme = theme;
  document.body.style.backgroundColor = variables['--joedla-background'];
}

function restoreLegacyOverrides() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.querySelectorAll<HTMLElement>('[data-joedla-theme-adjusted="true"]').forEach((element) => {
    const originalBackground = element.dataset.joedlaOriginalBackground;
    const originalColor = element.dataset.joedlaOriginalColor;
    if (originalBackground !== undefined) element.style.backgroundColor = originalBackground;
    if (originalColor !== undefined) element.style.color = originalColor;
    delete element.dataset.joedlaOriginalBackground;
    delete element.dataset.joedlaOriginalColor;
    delete element.dataset.joedlaThemeAdjusted;
  });
}

function harmonizeLegacySurfaces(root: ParentNode) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const elements: HTMLElement[] = [];
  if (root instanceof HTMLElement) elements.push(root);
  root.querySelectorAll?.('*').forEach((node) => {
    if (node instanceof HTMLElement) elements.push(node);
  });

  elements.forEach((element) => {
    if (element.dataset.joedlaThemeAdjusted === 'true') return;
    const computed = window.getComputedStyle(element);
    const backgroundReplacement = legacyBackgrounds[computed.backgroundColor];
    const colorReplacement = legacyTextColors[computed.color];
    if (!backgroundReplacement && !colorReplacement) return;

    element.dataset.joedlaThemeAdjusted = 'true';
    if (backgroundReplacement) {
      element.dataset.joedlaOriginalBackground = element.style.backgroundColor;
      element.style.backgroundColor = backgroundReplacement;
    }
    if (colorReplacement) {
      element.dataset.joedlaOriginalColor = element.style.color;
      element.style.color = colorReplacement;
    }
  });
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    void getStoredJson<ThemePreference>(STORAGE_KEY, 'system').then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    });
  }, []);

  const resolvedTheme: ResolvedTheme = preference === 'system'
    ? systemTheme === 'dark' ? 'dark' : 'light'
    : preference;

  useEffect(() => {
    restoreLegacyOverrides();
    applyWebTheme(resolvedTheme);

    if (resolvedTheme !== 'dark' || Platform.OS !== 'web' || typeof document === 'undefined') {
      return undefined;
    }

    const timer = window.setTimeout(() => harmonizeLegacySurfaces(document.body), 0);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) harmonizeLegacySurfaces(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      restoreLegacyOverrides();
    };
  }, [resolvedTheme]);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    void setStoredJson(STORAGE_KEY, next);
  }

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemeMode precisa estar dentro de ThemeProvider.');
  return context;
}
