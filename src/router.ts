import { useEffect, useState } from 'preact/hooks';

export const parseHash = (hash: string): string[] =>
  hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map((p) => decodeURIComponent(p));

/** Hash routing: works on any static host and from any sub-path. */
export function useRoute(): string[] {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const href = (...parts: string[]): string => '#/' + parts.map(encodeURIComponent).join('/');

export const navigate = (...parts: string[]): void => {
  location.hash = href(...parts);
};
