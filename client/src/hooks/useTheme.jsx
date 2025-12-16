/* eslint-disable react-refresh/only-export-components */
import { useState, useContext } from 'react';
import { ThemeContext } from './themeContext.js';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved || 'light';
  });

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const colors = {
    light: {
      bg: '#fff',
      bgSecondary: '#fafafa',
      text: '#000',
      textSecondary: '#666',
      border: '#ccc',
      buttonPrimary: '#111827',
      buttonSecondary: '#6c757d',
      input: '#fff',
    },
    dark: {
      bg: '#1a1a1a',
      bgSecondary: '#2d2d2d',
      text: '#e0e0e0',
      textSecondary: '#b0b0b0',
      border: '#444',
      buttonPrimary: '#404854',
      buttonSecondary: '#555',
      input: '#2d2d2d',
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors: colors[theme], isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
