import { CssBaseline, ThemeProvider as MuiThemeProvider, useMediaQuery } from '@mui/material';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createAppTheme } from './theme';
import { ThemeContext } from './ThemeContext';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [userOverride, setUserOverride] = useState<'light' | 'dark' | null>(null);

  const mode = userOverride ?? (prefersDarkMode ? 'dark' : 'light');
  const theme = createAppTheme(mode);

  useEffect(() => {
    document.documentElement.setAttribute('data-mui-color-scheme', mode);
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setUserOverride((prev) => {
      const currentMode = prev ?? (prefersDarkMode ? 'dark' : 'light');
      return currentMode === 'light' ? 'dark' : 'light';
    });
  }, [prefersDarkMode]);

  return (
    <ThemeContext value={{ isDarkMode: mode === 'dark', toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext>
  );
};
