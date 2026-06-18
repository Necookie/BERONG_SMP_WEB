// ThemeToggle.tsx — React island for dark/light mode toggle
// Reads/writes localStorage 'theme' key; syncs to <html> class

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  // Default to true (dark) so SSR matches the inline script default
  const [isDark, setIsDark] = useState(true);

  // On mount, sync React state to whatever the inline script already applied
  useEffect(() => {
    const html = document.documentElement;
    const currentlyDark = html.classList.contains('dark');
    setIsDark(currentlyDark);
  }, []);

  function applyTheme(dark: boolean) {
    const html = document.documentElement;
    if (dark) {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
    }
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {}
  }

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
  }

  return (
    <button
      id="theme-toggle-btn"
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
        color: 'inherit',
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
          color: isDark ? '#bfcaba' : 'transparent',
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
          color: isDark ? 'transparent' : '#4a5240',
        }}
      >
        dark_mode
      </span>
    </button>
  );
}
