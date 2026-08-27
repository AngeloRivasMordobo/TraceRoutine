import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { dark, light, type Theme } from './tokens';

export type ThemeMode = 'dark' | 'light' | 'auto';

const ThemeContext = createContext<Theme>(dark);

export function ThemeProvider({ mode, children }: { mode: ThemeMode; children: ReactNode }) {
  const scheme = useColorScheme();
  const theme = useMemo(() => {
    const resolved = mode === 'auto' ? (scheme === 'light' ? 'light' : 'dark') : mode;
    return resolved === 'light' ? light : dark;
  }, [mode, scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
