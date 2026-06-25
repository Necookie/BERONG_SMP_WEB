// ThemeToggle.tsx — React island for dark/light mode toggle
// Uses shared applyTheme utility from lib/theme.ts

import { useState, useEffect } from 'react';
import { applyTheme, type Theme } from '../lib/theme';

export default function ThemeToggle() {
  // Default to true (dark) so SSR matches the inline script default
  const [isDark, setIsDark] = useState(true);

  // On mount, sync React state to whatever the inline script already applied
  useEffect(() => {
    const currentlyDark = document.documentElement.classList.contains('dark');
    setIsDark(currentlyDark);
  }, []);

  function toggle() {
    const next: Theme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    applyTheme(next);
  }

  return (
    <button
      id="theme-toggle-btn"
      className="theme-toggle-btn"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        padding: '6px',
        cursor: 'pointer',
        background: 'transparent',
        border: 'none',
        transition: 'color 0.2s ease',
      }}
    >
      {/* Sun icon — visible in dark mode, click → switch to light */}
      <span
        className="material-symbols-outlined"
        aria-hidden="true"
        style={{
          fontSize: '20px',
          position: 'absolute',
          opacity: isDark ? 1 : 0,
          transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.5)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          pointerEvents: 'none',
          color: isDark ? 'currentColor' : 'transparent',
        }}
      >
        light_mode
      </span>

      {/* Moon icon — visible in light mode, click → switch to dark */}
      <span
        className="material-symbols-outlined"
        aria-hidden="true"
        style={{
          fontSize: '20px',
          position: 'absolute',
          opacity: isDark ? 0 : 1,
          transform: isDark ? 'rotate(-90deg) scale(0.5)' : 'rotate(0deg) scale(1)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          pointerEvents: 'none',
          color: isDark ? 'transparent' : 'currentColor',
        }}
      >
        dark_mode
      </span>
    </button>
  );
}
