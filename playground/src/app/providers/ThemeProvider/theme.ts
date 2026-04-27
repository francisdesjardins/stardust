import { alpha, createTheme, type Theme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    scrollbar: { thumb: string; track: string; width?: string | undefined };
  }
  interface ThemeOptions {
    scrollbar?: {
      thumb?: string | undefined;
      track?: string | undefined;
      width?: string | undefined;
    };
  }
  interface Palette {
    scrollbar: { thumb: string; track: string; width?: string | undefined };
  }
  interface PaletteOptions {
    scrollbar?: {
      thumb?: string | undefined;
      track?: string | undefined;
      width?: string | undefined;
    };
  }
}

export const createAppTheme = (mode: 'light' | 'dark') =>
  createTheme({
    scrollbar: {
      thumb: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
      track: 'transparent',
      width: '10px',
    },
    palette: {
      mode,
      primary: {
        main: '#d946ef',
        light: '#e879f9',
        dark: '#a21caf',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#f0abfc',
        light: '#f5d0fe',
        dark: '#c026d3',
        contrastText: '#000000',
      },
      ...(mode === 'dark' && {
        background: { default: '#000000', paper: '#121212' },
        text: { primary: '#ffffff', secondary: 'rgba(255, 255, 255, 0.7)' },
      }),
    },
    components: {
      MuiTooltip: {
        styleOverrides: {
          tooltip: { backgroundColor: '#d946ef', color: '#ffffff', fontSize: '0.875rem' },
          arrow: { color: '#d946ef' },
        },
      },
      MuiButton: {
        styleOverrides: {
          contained: { '&:hover': { backgroundColor: '#c026d3' } },
        },
      },
      MuiCssBaseline: {
        styleOverrides: (theme: Theme) => ({
          '*, *::before, *::after': {
            scrollbarWidth: 'thin',
            scrollbarColor: `${theme.scrollbar.thumb} ${theme.scrollbar.track}`,
          },
          '*::-webkit-scrollbar': { width: theme.scrollbar.width, height: theme.scrollbar.width },
          '*::-webkit-scrollbar-track': { background: theme.scrollbar.track },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: theme.scrollbar.thumb,
            borderRadius: 8,
            border: `2px solid ${theme.scrollbar.track}`,
          },
          '*::-webkit-scrollbar-thumb:hover': {
            backgroundColor: alpha(theme.scrollbar.thumb, 0.9),
          },
        }),
      },
    },
  });
