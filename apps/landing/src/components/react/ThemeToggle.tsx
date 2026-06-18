// ThemeToggle.tsx — React island for dark/light mode toggle
// Reads/writes localStorage 'theme' key; syncs to <html> class

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  // On mount, read stored or system preference
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const prefersDark =
      stored === 'dark' ||
      (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(prefersDark);
    applyTheme(prefersDark);
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
    localStorage.setItem('theme', dark ? 'dark' : 'light');
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
      className="
        relative flex items-center justify-center
        w-9 h-9 p-2
        text-on-surface-variant hover:text-primary
        transition-all duration-200
        hover:bg-surface-bright/10
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
      "
    >
      {/* Sun icon (shown in dark mode → click to go light) */}
      <span
        className={[
          'material-symbols-outlined absolute transition-all duration-300',
          isDark
            ? 'opacity-100 rotate-0 scale-100'
            : 'opacity-0 rotate-90 scale-50 pointer-events-none',
        ].join(' ')}
        aria-hidden="true"
        style={{ fontSize: '20px' }}
      >
        light_mode
      </span>

      {/* Moon icon (shown in light mode → click to go dark) */}
      <span
        className={[
          'material-symbols-outlined absolute transition-all duration-300',
          !isDark
            ? 'opacity-100 rotate-0 scale-100'
            : 'opacity-0 -rotate-90 scale-50 pointer-events-none',
        ].join(' ')}
        aria-hidden="true"
        style={{ fontSize: '20px' }}
      >
        dark_mode
      </span>
    </button>
  );
}
