import { useEffect, useState } from 'preact/hooks';
import { L, LANG, LANG_ID } from '../lang';
import { CLOUD_URL } from '../lib/cloud';

/**
 * "Down for updates" screen. The owner flips status/maintenance in the cloud
 * with "Close for updates.cmd" / "Open from updates.cmd"; everyone using the
 * app sees this straight away (a live stream from the database), and it
 * reloads the new version by itself when the app opens again.
 * Add ?maint=preview to the address to see the screen without closing the app.
 * (In development the switch is ignored unless the address has ?maint=watch.)
 */

const BACK_SOON: Record<typeof LANG_ID, [string, string]> = {
  la: ['Mox redībimus!', 'We’ll be back soon!'],
  de: ['Bis gleich!', 'See you soon!'],
  es: ['¡Volvemos pronto!', 'We’ll be back soon!'],
  fr: ['À très bientôt !', 'See you very soon!'],
  zh: ['马上回来!', 'Back very soon!'],
  ar: ['نَعُودُ قَرِيبًا!', 'We’ll be back soon!'],
  ja: ['また すぐ に!', 'See you again soon!'],
  ru: ['Скоро вернёмся!', 'We’ll be back soon!'],
  vi: ['Hẹn gặp lại sớm!', 'See you again soon!'],
};

/** Calls `cb` with true/false whenever the maintenance switch changes. */
function watchMaintenance(cb: (down: boolean) => void): () => void {
  const url = `${CLOUD_URL}/status/maintenance.json`;
  if (typeof EventSource !== 'undefined') {
    const es = new EventSource(url);
    const onData = (e: MessageEvent<string>) => {
      try {
        const { path, data } = JSON.parse(e.data) as { path: string; data: unknown };
        if (path === '/') cb(data === true);
      } catch {
        /* ignore keep-alives */
      }
    };
    es.addEventListener('put', onData as EventListener);
    es.addEventListener('patch', onData as EventListener);
    return () => es.close();
  }
  // Very old browsers: check every minute instead.
  const check = () =>
    void fetch(url, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => cb(d === true))
      .catch(() => undefined);
  check();
  const t = setInterval(check, 60_000);
  return () => clearInterval(t);
}

export function Maintenance() {
  const preview = new URLSearchParams(location.search).get('maint') === 'preview';
  const [down, setDown] = useState(preview);
  const [back, setBack] = useState(false);

  useEffect(() => {
    // In development the switch is ignored (so updates can be worked on while closed), unless ?maint=watch.
    const watch = new URLSearchParams(location.search).get('maint') === 'watch';
    if (preview || (import.meta.env.DEV && !watch)) return;
    let was = false;
    return watchMaintenance((d) => {
      if (was && !d) {
        // Open again: show "We're back!" for a moment, then load the new version.
        setBack(true);
        setTimeout(() => location.reload(), 1800);
      }
      was = d;
      setDown(d);
    });
  }, []);

  // Keep keyboard and screen-reader users out of the app underneath.
  useEffect(() => {
    const app = document.getElementById('app');
    if (!app) return;
    if (down || back) app.setAttribute('inert', '');
    else app.removeAttribute('inert');
    document.documentElement.classList.toggle('maint-on', down || back);
  }, [down, back]);

  if (!down && !back) return null;
  const [phrase, meaning] = BACK_SOON[LANG_ID];
  return (
    <div class={`maint${back ? ' back' : ''}`} role="alertdialog" aria-modal="true" aria-labelledby="maint-h" aria-describedby="maint-p">
      <div class="maint-floaters" aria-hidden="true">
        {LANG.floaters.map((w, i) => (
          <span key={w} lang={L} style={{ '--i': i }}>
            {w}
          </span>
        ))}
      </div>
      <div class="maint-card">
        <div class="maint-mark" aria-hidden="true">
          <span>L</span>
          <i class="maint-gear">⚙</i>
        </div>
        <p class="eyebrow">{LANG.app}</p>
        <h1 id="maint-h" class="maint-title">
          {back ? 'We’re back! 🎉' : <span class="grad">Down for updates</span>}
        </h1>
        <p id="maint-p" class="maint-text">
          {back
            ? 'Loading the new version…'
            : `Sorry, ${LANG.app} is currently down for updates. We’re making it even better, and your progress is safe.`}
        </p>
        {!back && (
          <>
            <div class="maint-bar" aria-hidden="true">
              <span />
            </div>
            <p class="maint-phrase">
              <b lang={L}>{phrase}</b> <span class="muted">({meaning})</span>
            </p>
            <p class="muted small">This page opens again by itself as soon as the update is finished.</p>
          </>
        )}
      </div>
    </div>
  );
}
