import { useState } from 'preact/hooks';
import { currentStreak, useProgress } from '../lib/progress';
import { href } from '../router';
import { Icon } from './Icon';

type Theme = 'light' | 'dark';
const THEME_KEY = 'latinlearn:theme';

const effectiveTheme = (): Theme => {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const prefetchReference = () => void import('../pages/Reference');

export function Header({ section }: { section: 'courses' | 'reference' | 'settings' | '' }) {
  const p = useProgress();
  const streak = currentStreak(p);
  const [theme, setTheme] = useState<Theme>(effectiveTheme);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
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
        <a class="brand" href={href()} aria-label="LatinLearn home">
          <span class="brand-mark" aria-hidden="true">
            L
          </span>
          <span class="brand-name">LatinLearn</span>
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
    </header>
  );
}

export function Footer() {
  return (
    <footer class="footer">
      <div class="container footer-inner">
        <p>
          <strong>LatinLearn</strong> teaches restored classical pronunciation. Progress saves automatically in this browser; back it up
          with a save file.
        </p>
        <a class="btn btn-ghost btn-sm" href={href('settings')}>
          <Icon name="sliders" size={14} /> Voice and saving
        </a>
      </div>
    </footer>
  );
}
