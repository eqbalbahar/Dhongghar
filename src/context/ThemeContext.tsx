import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSettings } from '@/context/SettingsContext';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  toggleVisible: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'dhong-ghar-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [theme, setThemeState] = useState<Theme>('dark');

  // Initialize from localStorage or admin default
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'dark' || stored === 'light') {
      setThemeState(stored);
    } else if (settings?.default_theme === 'light' || settings?.default_theme === 'dark') {
      setThemeState(settings.default_theme);
    }
  }, [settings?.default_theme]);

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('theme-light');
      root.classList.remove('theme-dark');
      root.style.colorScheme = 'light';
    } else {
      root.classList.add('theme-dark');
      root.classList.remove('theme-light');
      root.style.colorScheme = 'dark';
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  };

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const toggleVisible = settings?.theme_toggle_visible ?? true;

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme, toggleVisible }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
