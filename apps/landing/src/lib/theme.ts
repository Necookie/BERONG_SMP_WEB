/**
 * theme.ts — Shared theme utility for the landing app.
 *
 * Provides a canonical applyTheme() function used by ThemeToggle.astro.
 * The FOUC-prevention inline script in BaseLayout.astro mirrors this
 * logic but must remain serialized (no import) to run before first paint.
 */

export type Theme = 'dark' | 'light';

/** Read the stored theme preference from localStorage (safe — catches SSR). */
export function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // localStorage not available (SSR or restricted context)
  }
  return null;
}

/** Detect the user's OS-level preference. */
export function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return true;
  }
}

/** Resolve the effective theme (stored > system > default dark). */
export function resolveTheme(): Theme {
  const stored = readStoredTheme();
  if (stored) return stored;
  return systemPrefersDark() ? 'dark' : 'light';
}

/**
 * Apply a theme to the document by toggling html.dark / html.light,
 * and persist the choice to localStorage.
 */
export function applyTheme(isDark: boolean): void {
  const html = document.documentElement;
  if (isDark) {
    html.classList.add('dark');
    html.classList.remove('light');
  } else {
    html.classList.add('light');
    html.classList.remove('dark');
  }
  try {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  } catch {
    // ignore
  }
}
