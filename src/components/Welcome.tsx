import { useState } from 'preact/hooks';
import { iconSvg, LANGS, switchLanguage, type LangId } from '../lang';
import { formatCode, logIn } from '../lib/cloud';
import { readStored } from '../lib/progress';

/**
 * First-run screens:
 * - InstallGate: on an iPhone or iPad in the browser, LanguageLearn only runs
 *   from the Home Screen, so this shows how to add it.
 * - Onboarding: the first time the app opens, "Pick your LanguageLearn",
 *   with "Have an account? Log in" at the bottom, then a short setup.
 * Add ?gate=preview or ?onboard=preview to the address to see them.
 */

const DONE_KEY = 'latinlearn:onboarded';
const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);

const isAppleMobile = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches;

/** iPhone/iPad in Safari (or another browser): the app must be opened from the Home Screen. */
export function needsInstall(): boolean {
  if (params.get('gate') === 'preview') return true;
  if (import.meta.env.MODE === 'play' || import.meta.env.DEV) return false;
  return isAppleMobile() && !isStandalone();
}

/** Nobody has used the app on this device yet (older users are marked as done silently). */
export function needsOnboarding(): boolean {
  if (params.get('onboard') === 'preview') return true;
  try {
    if (localStorage.getItem(DONE_KEY)) return false;
    const used = Object.keys(localStorage).some((k) => k.startsWith('latinlearn:'));
    if (used || params.get('lang')) {
      localStorage.setItem(DONE_KEY, '1');
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

const icon = (id: LangId) => `data:image/svg+xml,${encodeURIComponent(iconSvg(id))}`;
const ALL = Object.values(LANGS);

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 15V3M8 7l4-4 4 4M6 11H5v10h14V11h-1" />
    </svg>
  );
}
function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export function InstallGate() {
  const ipad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return (
    <div class="welcome gate">
      <div class="welcome-card">
        <div class="gate-icons" aria-hidden="true">
          {ALL.map((l) => (
            <img key={l.id} src={icon(l.id)} alt="" width={40} height={40} />
          ))}
        </div>
        <h1 class="welcome-title">
          Get <span class="welcome-grad">LanguageLearn</span> on your {ipad ? 'iPad' : 'iPhone'}
        </h1>
        <p class="welcome-lede">It works as an app on your Home Screen: full screen, offline, and it remembers you. It takes ten seconds.</p>
        <ol class="gate-steps">
          <li>
            <span class="gate-num">1</span>
            <span>
              Tap <b>Share</b> <span class="gate-ico"><ShareIcon /></span> in Safari
              <span class="muted"> (on newer iPhones it’s inside the <b>⋯</b> button)</span>
            </span>
          </li>
          <li>
            <span class="gate-num">2</span>
            <span>
              Scroll down and tap <b>Add to Home Screen</b> <span class="gate-ico"><AddIcon /></span>
            </span>
          </li>
          <li>
            <span class="gate-num">3</span>
            <span>
              Tap <b>Add</b>, then open <b>LanguageLearn</b> from your Home Screen
            </span>
          </li>
        </ol>
        <p class="muted small">Using Chrome? Tap Share at the top, then Add to Home Screen.</p>
      </div>
      {!ipad && (
        <div class="gate-arrow" aria-hidden="true">
          ↓
        </div>
      )}
    </div>
  );
}

export function Onboarding() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [setup, setSetup] = useState<LangId | null>(null);
  const [step, setStep] = useState(0);

  const pick = (id: LangId) => {
    setSetup(id);
    void import('../data/courses').then((m) => m.loadCourses(id)); // warm up while the animation plays
    [1, 2, 3].forEach((n) => setTimeout(() => setStep(n), n * 650));
    setTimeout(() => {
      try {
        localStorage.setItem(DONE_KEY, '1');
      } catch {
        /* ignore */
      }
      switchLanguage(id);
    }, 2500);
  };

  if (setup) {
    const l = LANGS[setup];
    const steps = [`Loading 11 ${l.language} courses`, `Tuning the ${l.language} voice`, `Painting it in the colours of ${l.place}`];
    return (
      <div class="welcome setup" style={{ '--brand-bg': l.brandBg, '--acc': l.accent[1] }}>
        <div class="welcome-card">
          <img class="setup-icon" src={icon(setup)} alt="" width={104} height={104} />
          <h1 class="welcome-title">Setting up {l.app}…</h1>
          <ul class="setup-steps" aria-live="polite">
            {steps.map((s, i) => (
              <li key={s} class={step > i ? 'done' : step === i ? 'now' : ''}>
                <span class="setup-tick">{step > i ? '✓' : ''}</span> {s}
              </li>
            ))}
          </ul>
          <p class="setup-ready">{step >= 3 ? `Ready! ${l.hello}` : ' '}</p>
        </div>
      </div>
    );
  }

  const xp = (id: LangId) => (account ? readStored(id).xp : 0);

  return (
    <div class="welcome">
      <div class="welcome-card wide">
        <p class="eyebrow">{account ? 'Welcome back!' : 'Welcome'}</p>
        <h1 class="welcome-title">
          Pick your <span class="welcome-grad">LanguageLearn</span>
        </h1>
        <p class="welcome-lede">
          {account
            ? 'Your progress is here. Pick a language to carry on.'
            : 'Eight languages, eleven courses each, real voices. You can switch any time.'}
        </p>
        <div class="welcome-grid">
          {ALL.map((l) => (
            <button type="button" key={l.id} class="welcome-lang" style={{ '--acc': l.accent[1] }} onClick={() => pick(l.id)}>
              <img src={icon(l.id)} alt="" width={52} height={52} />
              <span class="welcome-name">{l.app}</span>
              <span class="welcome-native" lang={l.id}>
                {l.flag} {l.native}
              </span>
              {xp(l.id) > 0 && <span class="welcome-xp">{xp(l.id)} XP</span>}
            </button>
          ))}
        </div>
        <div class="welcome-login">
          {account ? (
            <p class="welcome-ok">✓ Logged in with {formatCode(account)}</p>
          ) : !loginOpen ? (
            <button type="button" class="welcome-link" onClick={() => setLoginOpen(true)}>
              Have an account? <b>Log in</b>
            </button>
          ) : (
            <form
              class="cloud-login"
              onSubmit={(e) => {
                e.preventDefault();
                setBusy(true);
                setMsg(null);
                void logIn(code).then((r) => {
                  setBusy(false);
                  if (r === 'ok') setAccount(code.replace(/\D/g, ''));
                  else setMsg(r === 'wrong' ? 'That code doesn’t match an account. Check the 10 digits.' : 'Couldn’t reach the internet. Try again.');
                });
              }}
            >
              <input
                value={code}
                onInput={(e) => setCode(e.currentTarget.value)}
                inputMode="numeric"
                maxLength={13}
                placeholder="Your 10-digit code"
                aria-label="Your 10-digit login code"
                autoFocus
              />
              <button type="submit" class="btn btn-primary" disabled={busy || code.replace(/\D/g, '').length !== 10}>
                {busy ? 'Logging in…' : 'Log in'}
              </button>
            </form>
          )}
          {msg && <p class="save-msg bad">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
