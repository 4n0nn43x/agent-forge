import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'agentforge-theme';

/**
 * Three states, not two: 'system' follows the OS, 'light' and 'dark' override it.
 *
 * The override is applied as data-theme on <html>, which the token layer defines
 * after the prefers-color-scheme block so it wins in both directions. 'system'
 * removes the attribute rather than computing a value, so the page keeps tracking
 * the OS if it changes while open.
 */
export function useTheme() {
  const [preference, setPreference] = useState(() => {
    if (typeof window === 'undefined') return 'system';
    return window.localStorage.getItem(STORAGE_KEY) || 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (preference === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', preference);
    }
    window.localStorage.setItem(STORAGE_KEY, preference);
  }, [preference]);

  // What is actually on screen, which 'system' alone can't tell us.
  const [resolved, setResolved] = useState('light');
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const compute = () =>
      setResolved(preference === 'system' ? (query.matches ? 'dark' : 'light') : preference);
    compute();
    query.addEventListener('change', compute);
    return () => query.removeEventListener('change', compute);
  }, [preference]);

  const cycle = useCallback(() => {
    setPreference((current) =>
      current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system'
    );
  }, []);

  return { preference, resolved, setPreference, cycle };
}

export default useTheme;
