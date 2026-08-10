// Tema claro/escuro ('auto' segue o sistema), alto contraste e tamanho de
// fonte. Tudo fica salvo no banco (tabela settings) e sobrevive ao fechar o app.

import { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getSetting, setSetting } from './db/core';
import { setGlobalFontScale } from './font-scale';
import { palettes } from './theme';

const ThemeContext = createContext(null);

const NEXT_MODE = { auto: 'dark', dark: 'light', light: 'auto' };
export const MODE_LABEL = { auto: 'Automático', dark: 'Escuro', light: 'Claro' };
export const MODE_EMOJI = { auto: '🌗', dark: '🌙', light: '☀️' };

// Escalas de fonte oferecidas nos Ajustes.
export const FONT_SCALES = [
  { key: 'normal', label: 'Padrão', value: 1 },
  { key: 'grande', label: 'Grande', value: 1.15 },
  { key: 'maior', label: 'Maior', value: 1.3 },
];

// Reforça texto, bordas e fundo quando o alto contraste está ligado.
function withContrast(palette, isDark) {
  return {
    ...palette,
    text: isDark ? '#FFFFFF' : '#000000',
    textMuted: isDark ? '#C9D1D9' : '#2B333D',
    border: isDark ? '#6B7683' : '#6B7683',
    background: isDark ? '#000000' : '#FFFFFF',
    card: isDark ? '#14181E' : '#FFFFFF',
  };
}

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [mode, setMode] = useState(() => getSetting('theme', 'auto'));
  const [highContrast, setHC] = useState(() => getSetting('high_contrast', '0') === '1');
  const [fontScaleKey, setFontScaleKey] = useState(() => getSetting('font_scale', 'normal'));

  const isDark = mode === 'dark' || (mode === 'auto' && system === 'dark');

  // Garante que a escala salva já valha desde o primeiro render.
  const scaleValue = (FONT_SCALES.find((f) => f.key === fontScaleKey) ?? FONT_SCALES[0]).value;
  setGlobalFontScale(scaleValue);

  const value = useMemo(() => {
    const base = isDark ? palettes.dark : palettes.light;
    return {
      colors: highContrast ? withContrast(base, isDark) : base,
      isDark,
      mode,
      highContrast,
      fontScaleKey,
      cycleMode: () =>
        setMode((current) => {
          const next = NEXT_MODE[current] ?? 'auto';
          setSetting('theme', next);
          return next;
        }),
      setHighContrast: (on) => {
        setSetting('high_contrast', on ? '1' : '0');
        setHC(on);
      },
      setFontScale: (key) => {
        setSetting('font_scale', key);
        setGlobalFontScale((FONT_SCALES.find((f) => f.key === key) ?? FONT_SCALES[0]).value);
        setFontScaleKey(key);
      },
      // Volta aparência aos padrões (não mexe nos dados do usuário).
      resetAppearance: () => {
        setSetting('theme', 'auto');
        setSetting('high_contrast', '0');
        setSetting('font_scale', 'normal');
        setGlobalFontScale(1);
        setMode('auto');
        setHC(false);
        setFontScaleKey('normal');
      },
    };
  }, [isDark, mode, highContrast, fontScaleKey]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
