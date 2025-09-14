import { createTheme, type Theme, type ThemeOptions } from '@mui/material/styles';

const baseTheme: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          transition: 'box-shadow 0.3s ease-in-out',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          textAlign: 'left',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& input': {
            textAlign: 'left',
          },
        },
      },
    },
  },
};

export const lightTheme: Theme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'light',
    primary: {
      main: '#1f5582',
      light: '#4682b4',
      dark: '#1a4971',
    },
    secondary: {
      main: '#7c3aed',
      light: '#a78bfa',
      dark: '#5b21b6',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    error: {
      main: '#ef4444',
    },
    success: {
      main: '#22c55e',
    },
  },
});

export const darkTheme: Theme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#4682b4',
      light: '#5a9bd4',
      dark: '#1f5582',
    },
    secondary: {
      main: '#a78bfa',
      light: '#c4b5fd',
      dark: '#8b5cf6',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    error: {
      main: '#f87171',
    },
    success: {
      main: '#4ade80',
    },
  },
});
