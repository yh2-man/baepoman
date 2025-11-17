import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

const ThemeContext = createContext(null);

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Initialize theme from localStorage or default to 'theme-default'
    return localStorage.getItem('app-theme') || 'theme-default';
  });

  useEffect(() => {
    // Apply the theme class to the body element
    document.body.className = theme;
    // Persist theme choice to localStorage
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const changeTheme = useCallback((newTheme) => {
    setTheme(newTheme);
  }, []);

  const value = {
    theme,
    changeTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};