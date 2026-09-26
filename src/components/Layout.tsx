import { useEffect, useRef, useState } from 'preact/hooks';
import { cx } from '../lib/hooks';
import { currentStreak, useProgress } from '../lib/progress';
import { applyLanguage, LANG, LANG_ID, LANGS, switchLanguage } from '../lang';
import { href } from '../router';
import { Icon } from './Icon';

type Theme = 'light' | 'dark';
const THEME_KEY = 'latinlearn:theme';

const effectiveTheme = (): Theme => {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const prefetchReference = () => void (LANG_ID === 'la' ? import('../pages/Reference') : import('../pages/RefModern'));

/** "Don't like Latin? Pick another!" */
export function LanguagePicker({ onClose }: { onClose: () => void }) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, []);
  return (
    <div class="lang-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="lang-dialog" role="dialog" aria-modal="true" aria-labelledby="lang-h">
        <h2 id="lang-h">Don’t like {LANG.language}? Pick another!</h2>
        <p class="muted small">Every app has all eleven courses, its own voices and colours. Your login code works for all of them.</p>
        <div class="lang-grid">
          {Object.values(LANGS).map((l, i) => (
            <button
              type="button"
              key={l.id}
              ref={i === 0 ? first : undefined}
              class={cx('lang-option', l.id === LANG.id && 'on')}
              style={{ '--brand-bg': l.brandBg }}
              onClick={() => (l.id === LANG.id ? onClose() : switchLanguage(l.id))}
            >
              <span class="lang-mark" aria-hidden="true">
                L
              </span>
              <span class="lang-name">{l.app}</span>
              <span class="lang-native" lang={l.id}>
                {l.flag} {l.native}
              </span>
              {l.id === LANG.id && <span class="lang-now">You’re here</span>}
            </button>
          ))}
        </div>
        <button type="button" class="btn btn-ghost btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

const HOLD_MS = 3000;

export function Header({ section }: { section: 'courses' | 'reference' | 'settings' | '' }) {
  const p = useProgress();
  const streak = currentStreak(p);
  const [theme, setTheme] = useState<Theme>(effectiveTheme);
  // Switch language app: triple-click the logo on a computer, or hold it for 3 seconds on a phone.
  const clicks = useRef<number[]>([]);
  const [holding, setHolding] = useState(false);
  const [picker, setPicker] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout>>();
  const held = useRef(false);
  const startHold = (e: PointerEvent) => {
    if (e.button > 0) return;
    held.current = false;
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      held.current = true;
      setHolding(false);
      setPicker(true);
      navigator.vibrate?.(40);
    }, HOLD_MS);
  };
  const stopHold = () => {
    clearTimeout(holdTimer.current);
    setHolding(false);
  };

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    applyLanguage(); // flag colours have a light and a dark shade
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
    setTheme(next);
  };

  return (
    <header class="topbar">
      <div class="container topbar-inner">
        <a
          class={cx('brand', holding && 'holding')}
          href={href()}
          aria-label={`${LANG.app} home (triple-click, or hold for 3 seconds, to switch language)`}
          title="Triple-click (or hold on a phone) to switch language"
          onPointerDown={startHold}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onContextMenu={(e) => e.preventDefault()}
          onClick={(e) => {
            if (held.current) {
              e.preventDefault();
              held.current = false;
              return;
            }
            const now = Date.now();
            clicks.current = [...clicks.current.filter((t) => now - t < 700), now];
            if (clicks.current.length >= 3) {
              e.preventDefault();
              clicks.current = [];
              setPicker(true);
            }
          }}
          draggable={false}
        >
          <span class="brand-mark" aria-hidden="true">
            L
          </span>
          <span class="brand-name">{LANG.app}</span>
        </a>
        <nav class="nav" aria-label="Main">
          <a href={href()} aria-current={section === 'courses' ? 'page' : undefined}>
            <Icon name="book" size={16} />
            <span>Courses</span>
          </a>
          <a
            href={href('reference')}
            aria-current={section === 'reference' ? 'page' : undefined}
            onPointerEnter={prefetchReference}
            onFocus={prefetchReference}
          >
            <Icon name="column" size={16} />
            <span>Lexicon</span>
          </a>
        </nav>
        <div class="top-right">
          <span class={streak ? 'chip chip-streak live' : 'chip chip-streak'} title={`${streak}-day streak`}>
            <Icon name="flame" size={16} />
            <span>{streak}</span>
            <span class="sr-only">day streak</span>
          </span>
          <span class="chip chip-xp" title="Experience points">
            <Icon name="sparkle" size={16} />
            <span>{p.xp}</span>
            <span class="sr-only">XP</span>
          </span>
          <a
            class="icon-btn"
            href={href('settings')}
            aria-label="Settings: voice and save file"
            title="Settings: voice and save file"
            aria-current={section === 'settings' ? 'page' : undefined}
          >
            <Icon name="sliders" size={18} />
          </a>
          <button
            type="button"
            class="icon-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
        </div>
      </div>
      {picker && <LanguagePicker onClose={() => setPicker(false)} />}
    </header>
  );
}

export function Footer() {
  return (
    <footer class="footer">
      <div class="container footer-inner">
        <p>
          <strong>{LANG.app}</strong> {LANG.id === 'la' ? 'teaches restored classical pronunciation.' : `teaches ${LANG.language} with native voices.`} Progress saves automatically in this browser; back it up
          with a save file.
        </p>
        <a class="btn btn-ghost btn-sm" href={href('settings')}>
          <Icon name="sliders" size={14} /> Voice and saving
        </a>
      </div>
    </footer>
  );
}
