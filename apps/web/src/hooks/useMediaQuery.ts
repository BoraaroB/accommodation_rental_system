import { useCallback, useSyncExternalStore } from 'react';

/** The `md` breakpoint of the design (Tailwind's default, 48rem). */
export const DESKTOP_QUERY = '(min-width: 48rem)';

/**
 * Whether a media query matches, e.g. to show two calendar months on wide
 * screens. `false` where `matchMedia` does not exist (jsdom).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== 'function') {
        return () => {};
      }
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () =>
      typeof window.matchMedia === 'function' &&
      window.matchMedia(query).matches,
  );
}
