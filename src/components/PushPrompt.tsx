import { useEffect, useState } from 'preact/hooks';
import { LANG } from '../lang';
import { enablePush, shouldAskPush } from '../lib/push';
import { href } from '../router';
import { Icon } from './Icon';

/**
 * Each time the app opens, offer notifications until they're on, or until the
 * learner taps "I don't want notifications" in Settings. Browsers only show
 * their Allow/Don't Allow box after a tap, so this asks first.
 */
export function PushPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setShow(shouldAskPush()), 1500);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;

  return (
    <div class="push-prompt" role="dialog" aria-labelledby="push-prompt-h">
      <p id="push-prompt-h" class="push-prompt-title">
        🔔 Turn on notifications?
      </p>
      <p class="push-prompt-text">
        {error || `${LANG.app} can warn you before your streak runs out and remind you to practise.`}
      </p>
      <div class="push-prompt-btns">
        <button
          type="button"
          class="btn btn-primary btn-sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await enablePush();
              if (r === 'ok') setShow(false);
              else setError('Notifications weren’t allowed. You can turn them on later in Settings.');
            } catch {
              setError('Couldn’t turn notifications on. Check your internet and try again.');
            }
            setBusy(false);
          }}
        >
          <Icon name="check" size={16} /> Yes, turn on
        </button>
        <button type="button" class="btn btn-ghost btn-sm" onClick={() => setShow(false)}>
          Not now
        </button>
      </div>
      <a class="push-prompt-never" href={href('settings')} onClick={() => setShow(false)}>
        Don’t want them? Turn this off in Settings
      </a>
    </div>
  );
}
