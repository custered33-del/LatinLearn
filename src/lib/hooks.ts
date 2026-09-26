import { useEffect, useRef } from 'preact/hooks';
import { LANG } from '../lang';

/** Set the document title; pass null to leave it to a child page. */
export function useTitle(title: string | null): void {
  useEffect(() => {
    if (title !== null) document.title = title ? `${title} · ${LANG.app}` : LANG.app;
  }, [title]);
}

/**
 * Global keyboard shortcuts. Ignored while typing, and Space/Enter are left
 * alone on focused buttons and links so they keep their native behaviour.
 */
export function useKeys(handler: (e: KeyboardEvent) => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if ((e.key === ' ' || e.key === 'Enter') && t && (t.tagName === 'BUTTON' || t.tagName === 'A')) return;
      ref.current(e);
    };
    addEventListener('keydown', on);
    return () => removeEventListener('keydown', on);
  }, []);
}

export const cx = (...parts: (string | false | null | undefined)[]): string => parts.filter(Boolean).join(' ');

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
