import { useState } from 'preact/hooks';
import { iconSvg, LANG, LANG_ID, LANGS, switchLanguage, type LangId } from '../lang';
import { cloudCode, formatCode, logIn } from '../lib/cloud';
import { readStored } from '../lib/progress';

/**
 * First-run screens, in this order:
 * 1. Onboarding: "Pick your LanguageLearn" (or log in), then a short setup.
 * 2. InstallGate (iPhone/iPad browser only): add the chosen app to the Home
 *    Screen, so its icon and name match the language. The app only runs from there.
 * 3. FirstOpen: the first time the app opens with a language already chosen
 *    (e.g. from the Home Screen): "Welcome to GermanLearn", or log in.
 * Add ?gate=preview, ?onboard=preview or ?welcome=preview to the address to see them.
 */

const DONE_KEY = 'latinlearn:onboarded';
const LANG_KEY = 'latinlearn:lang';
const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);

const isAppleMobile = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches;
const langChosen = () => {
  try {
    return !!params.get('lang') || !!localStorage.getItem(LANG_KEY);
  } catch {
    return !!params.get('lang');
  }
};
const markDone = () => {
  try {
    localStorage.setItem(DONE_KEY, '1');
  } catch {
    /* ignore */
  }
};

export type FirstRun = 'pick' | 'install' | 'welcome' | null;

/** Which first-run screen (if any) this visit needs. */
export function firstRun(): FirstRun {
  if (params.get('gate') === 'preview') return 'install';
  if (params.get('onboard') === 'preview') return 'pick';
  if (params.get('welcome') === 'preview') return 'welcome';
  const iosBrowser = import.meta.env.PROD && import.meta.env.MODE !== 'play' && isAppleMobile() && !isStandalone();
  // iPhone/iPad in the browser: choose the language first, then add that app to the Home Screen.
  if (iosBrowser) return langChosen() ? 'install' : 'pick';
  try {
    if (localStorage.getItem(DONE_KEY)) return null;
    // Someone already using the app on this device: never show the welcome.
    const used = Object.keys(localStorage).some((k) => k.startsWith('latinlearn:') && k !== LANG_KEY);
    if (used) {
      markDone();
      return null;
    }
  } catch {
    return null;
  }
  return langChosen() ? 'welcome' : 'pick';
}

const icon = (id: LangId) => `data:image/svg+xml,${encodeURIComponent(iconSvg(id))}`;
const ALL = Object.values(LANGS);

/** "Have an account? Log in" with the 10-digit code box. */
function LoginBox({ prompt, onDone }: { prompt: string; onDone: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div class="welcome-login">
      {!open ? (
        <button type="button" class="welcome-link" onClick={() => setOpen(true)}>
          {prompt} <b>Log in</b>
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
              if (r === 'ok') onDone(code.replace(/\D/g, ''));
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
  );
}

// ---------------------------------------------------------------------------
// 1. Pick your LanguageLearn
// ---------------------------------------------------------------------------

export function Onboarding() {
  const [account, setAccount] = useState<string | null>(null);
  const [setup, setSetup] = useState<LangId | null>(null);
  const [step, setStep] = useState(0);

  const pick = (id: LangId) => {
    setSetup(id);
    void import('../data/courses').then((m) => m.loadCourses(id)); // warm up while the animation plays
    [1, 2, 3].forEach((n) => setTimeout(() => setStep(n), n * 650));
    setTimeout(() => {
      // On an iPhone browser this reloads into the Home Screen guide for this language.
      if (!(isAppleMobile() && !isStandalone())) markDone();
      switchLanguage(id);
    }, 2500);
  };

  if (setup) {
    const l = LANGS[setup];
    const steps = [`Loading 11 ${l.language} courses`, `Tuning the ${l.language} voice`, `Painting it in the colours of ${l.place}`];
    return (
      <div class="welcome setup" style={{ '--acc': l.accent[1] }}>
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
          {account ? 'Your progress is here. Pick a language to carry on.' : 'Nine languages, eleven courses each, real voices. You can switch any time.'}
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
        {account ? (
          <p class="welcome-ok">✓ Logged in with {formatCode(account)}</p>
        ) : (
          <LoginBox prompt="Have an account?" onDone={setAccount} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Add to Home Screen (iPhone/iPad browser)
// ---------------------------------------------------------------------------

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

/** Pick again: forget the language and go back to "Pick your LanguageLearn". */
function pickAgain() {
  try {
    localStorage.removeItem(LANG_KEY);
  } catch {
    /* ignore */
  }
  location.replace(location.pathname);
}

export function InstallGate() {
  const ipad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // The Home Screen app opens this address, so it starts in the right language.
  history.replaceState(null, '', `${location.pathname}?lang=${LANG_ID}`);
  return (
    <div class="welcome gate" style={{ '--acc': LANG.accent[1] }}>
      <div class="welcome-card">
        <img class="setup-icon" src={icon(LANG_ID)} alt="" width={96} height={96} />
        <h1 class="welcome-title">
          Add <span class="welcome-grad">{LANG.app}</span> to your Home Screen
        </h1>
        <p class="welcome-lede">
          {LANG.app} works as an app on your {ipad ? 'iPad' : 'iPhone'}: full screen, offline, and it remembers you. It takes ten seconds.
        </p>
        <ol class="gate-steps">
          <li>
            <span class="gate-num">1</span>
            <span>
              Tap <b>Share</b>{' '}
              <span class="gate-ico">
                <ShareIcon />
              </span>{' '}
              in Safari <span class="muted">(on newer iPhones it’s inside the <b>⋯</b> button)</span>
            </span>
          </li>
          <li>
            <span class="gate-num">2</span>
            <span>
              Scroll down and tap <b>Add to Home Screen</b>{' '}
              <span class="gate-ico">
                <AddIcon />
              </span>
            </span>
          </li>
          <li>
            <span class="gate-num">3</span>
            <span>
              Tap <b>Add</b>, then open <b>{LANG.app}</b> from your Home Screen
            </span>
          </li>
        </ol>
        {cloudCode() && <p class="muted small">You’ll log in once more inside the app: your code is {formatCode(cloudCode()!)}.</p>}
        <p class="muted small">Using Chrome? Tap Share at the top, then Add to Home Screen.</p>
        <button type="button" class="welcome-link" onClick={pickAgain}>
          Want a different language? <b>Pick again</b>
        </button>
      </div>
      {!ipad && (
        <div class="gate-arrow" aria-hidden="true">
          ↓
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. First open with a language chosen (e.g. from the Home Screen)
// ---------------------------------------------------------------------------

export function FirstOpen() {
  const start = () => {
    markDone();
    location.replace(`${location.pathname}#/`);
  };
  return (
    <div class="welcome" style={{ '--acc': LANG.accent[1] }}>
      <div class="welcome-card">
        <img class="setup-icon" src={icon(LANG_ID)} alt="" width={104} height={104} />
        <p class="eyebrow">Welcome to</p>
        <h1 class="welcome-title">
          <span class="welcome-grad">{LANG.app}</span>
        </h1>
        <p class="welcome-lede">{LANG.lede}</p>
        <button type="button" class="btn btn-primary btn-lg" onClick={start}>
          Start learning →
        </button>
        <LoginBox prompt="Already have an account?" onDone={start} />
        <button type="button" class="welcome-link small" onClick={pickAgain}>
          Learn a different language
        </button>
      </div>
    </div>
  );
}
