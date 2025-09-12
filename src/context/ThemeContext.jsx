import { createTheme } from '@mui/material';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { darkTheme, lightTheme } from '../theme';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check for system preference first if no saved preference exists
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    // Use system preference as fallback
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const theme = createTheme(isDarkMode ? darkTheme : lightTheme);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Apply dark mode class to HTML element (but not on marketing pages)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isMarketingPage =
        location.pathname.startsWith('/home') ||
        location.pathname.startsWith('/pricing') ||
        location.pathname.startsWith('/free-signup') ||
        location.pathname.startsWith('/checkout') ||
        location.pathname.startsWith('/contact') ||
        location.pathname === '/';

      if (isDarkMode && !isMarketingPage) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode, location.pathname]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
