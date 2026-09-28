import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { Rich } from '../components/ui';
import { cx, useTitle } from '../lib/hooks';
import { AI_SYSTEM, START_CHIPS, aiHints } from '../lib/auxilium';
import { LANG, greeting } from '../lang';
import { accountName } from '../lib/cloud';
import { DEFAULT_QWEN, QWEN_MODELS, formatSize, isDownloaded, loadQwen, loadedModel, qwenByKey, qwenChat, qwenSupport, removeQwen, type QwenModel } from '../lib/qwen';
import './auxilium.css';

interface Msg {
  who: 'me' | 'aux';
  /** Supports **bold** and _italics_. */
  text: string;
  chips?: string[];
}

const QWEN_KEY = 'latinlearn:qwen-model';
const IS_PHONE = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

const store = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};
const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

/** Pick, download and remove the Qwen models. Auxilium needs one to work. */
function ModelPicker({
  choice,
  have,
  prog,
  error,
  onChoose,
  onDownload,
  onRemove,
}: {
  choice: QwenModel;
  have: Record<string, boolean>;
  prog: { p: number; text: string } | null;
  error: string;
  onChoose: (m: QwenModel) => void;
  onDownload: (m: QwenModel) => void;
  onRemove: (m: QwenModel) => void;
}) {
  return (
    <>
      <div class="qwen-list" role="radiogroup" aria-label="AI model">
        {QWEN_MODELS.map((m) => (
          <label key={m.key} class={cx('qwen-card', choice.key === m.key && 'on')}>
            <input type="radio" name="qwen" checked={choice.key === m.key} disabled={!!prog} onChange={() => onChoose(m)} />
            <span class="qwen-info">
              <span class="qwen-top">
                <b>{m.name}</b>
                {m.recommended && <span class="qwen-badge">Recommended</span>}
                <span class="qwen-size">{formatSize(m.mb)}</span>
              </span>
              <small class="muted">
                {m.note}
                {IS_PHONE && m.big ? ' Too big for most phones.' : ''}
              </small>
              {have[m.key] && <small class="qwen-have">✓ Downloaded</small>}
            </span>
          </label>
        ))}
      </div>
      {prog ? (
        <div class="qwen-progress" aria-live="polite">
          <div class="family-bar">
            <span style={{ width: `${Math.round(prog.p * 100)}%` }} />
          </div>
          <small class="muted">
            {Math.round(prog.p * 100)}% · {prog.text.replace(/\[.*?\]\s*/g, '').slice(0, 90)}
          </small>
          <small class="muted">Keep this page open until it finishes.</small>
        </div>
      ) : have[choice.key] ? (
        <div class="btn-row">
          <button type="button" class="btn btn-ghost btn-sm" onClick={() => onRemove(choice)}>
            <Icon name="trash" size={14} /> Remove {choice.name} ({formatSize(choice.mb)})
          </button>
        </div>
      ) : (
        <div class="btn-row">
          <button type="button" class="btn btn-primary" onClick={() => onDownload(choice)}>
            <Icon name="download" size={18} /> Download {choice.name} ({formatSize(choice.mb)})
          </button>
        </div>
      )}
      {error && <p class="save-msg bad">{error}</p>}
    </>
  );
}

export function Auxilium() {
  useTitle('Auxilium');
  const [log, setLog] = useState<Msg[]>(() => [
    {
      who: 'aux',
      text: `_${accountName() ? `${greeting()[0]}, ${accountName()}!` : LANG.hello}_ I’m **Auxilium**, your ${LANG.language} practice buddy. Ask me anything about ${LANG.language}, or tap an idea below.`,
      chips: START_CHIPS,
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [gpu, setGpu] = useState<{ ok: boolean; f16: boolean } | undefined>();
  const [choice, setChoice] = useState<QwenModel>(() => qwenByKey(read(QWEN_KEY)) ?? DEFAULT_QWEN);
  const [have, setHave] = useState<Record<string, boolean> | undefined>();
  const [prog, setProg] = useState<{ p: number; text: string } | null>(null);
  const [error, setError] = useState('');
  const [showModels, setShowModels] = useState(false);
  const [live, setLive] = useState(loadedModel());
  const bottom = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void qwenSupport().then(async (g) => {
      setGpu(g);
      if (!g.ok) return;
      const found = Object.fromEntries(await Promise.all(QWEN_MODELS.map(async (m) => [m.key, await isDownloaded(m)] as const)));
      setHave(found);
      // If the chosen model isn't here but another one is, use that one.
      setChoice((c) => (found[c.key] ? c : (QWEN_MODELS.find((m) => found[m.key]) ?? c)));
    });
  }, []);
  useEffect(() => bottom.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), [log.length, busy]);

  const choose = (m: QwenModel) => {
    setChoice(m);
    setError('');
    store(QWEN_KEY, m.key);
  };
  const download = async (m: QwenModel) => {
    setError('');
    setProg({ p: 0, text: 'Starting the download…' });
    // Ask the browser to keep the model even when space runs low.
    void navigator.storage?.persist?.().catch(() => undefined);
    try {
      await loadQwen(m, (p, text) => setProg({ p, text }));
      setHave((h) => ({ ...h, [m.key]: true }));
      setLive(loadedModel());
      choose(m);
      setShowModels(false);
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      setError(
        /memory|device lost|allocat/i.test(msg)
          ? `${m.name} is too big for this device. Try a smaller model.`
          : /quota|storage|space/i.test(msg)
            ? 'Not enough free space on this device for that model.'
            : 'The download stopped. Check your internet and try again (it carries on where it left off).',
      );
    }
    setProg(null);
  };
  const remove = async (m: QwenModel) => {
    if (!confirm(`Remove ${m.name} from this device? You can download it again any time.`)) return;
    await removeQwen(m);
    setHave((h) => ({ ...h, [m.key]: false }));
    setLive(loadedModel());
  };
  /** Put the chosen model into memory (only when asked, so opening Auxilium never crashes). */
  const load = async () => {
    setError('');
    setProg({ p: 0, text: 'Loading…' });
    try {
      await loadQwen(choice, (p, text) => setProg({ p, text }));
    } catch {
      setError(`${choice.name} couldn’t load on this device. It may be too big: try a smaller model.`);
    }
    setLive(loadedModel());
    setProg(null);
  };

  const add = (...msgs: Msg[]) => setLog((l) => [...l, ...msgs]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setInput('');
    const me: Msg = { who: 'me', text };
    add(me);
    setBusy(true);
    try {
      const history = [...log.slice(1), me].map((m) => ({ role: m.who === 'me' ? ('user' as const) : ('assistant' as const), content: m.text }));
      const answer = await qwenChat(choice, AI_SYSTEM + aiHints(text), history);
      add({ who: 'aux', text: answer });
    } catch {
      add({ who: 'aux', text: `${choice.name} couldn’t answer on this device. Try a smaller model (tap **Change model**).` });
    } finally {
      setBusy(false);
      field.current?.focus();
    }
  };

  const ready = !!(gpu?.ok && have?.[choice.key]);
  const last = log[log.length - 1];
  const picker = (
    <ModelPicker choice={choice} have={have ?? {}} prog={prog} error={error} onChoose={choose} onDownload={(m) => void download(m)} onRemove={(m) => void remove(m)} />
  );

  return (
    <div class="container aux-page">
      <header class="page-head aux-head">
        <span class="aux-avatar" aria-hidden="true">
          <Icon name="chat" size={26} />
        </span>
        <div>
          <p class="eyebrow">Your AI practice buddy</p>
          <h1>Auxilium</h1>
          <p class="muted">{ready ? `Powered by ${choice.name}, running right here on this device.` : `Chat about ${LANG.language} with an AI that runs on your device.`}</p>
        </div>
      </header>

      {gpu === undefined || (gpu.ok && !have) ? (
        <p class="muted">Checking this device…</p>
      ) : !gpu.ok ? (
        <section class="panel aux-ai">
          <h2 class="h-sm">
            <Icon name="sparkle" size={18} /> Auxilium needs a newer browser
          </h2>
          <p class="muted">
            {import.meta.env.MODE === 'play'
              ? 'The PC file can’t run the AI. Open the online app to use Auxilium.'
              : 'This browser can’t run the AI on this device (it needs WebGPU). Try the latest Chrome or Edge, or Safari on iOS 26 or newer.'}
          </p>
        </section>
      ) : !ready ? (
        <section class="panel aux-ai aux-setup">
          <h2 class="h-sm">
            <Icon name="download" size={18} /> Download an AI model <span class="aux-required">Required for Auxilium</span>
          </h2>
          <p class="muted small">
            Auxilium is an AI that runs right here on your device: free, private, and it works offline once downloaded. Pick a model and
            download it once. Bigger models are smarter but need more space and a stronger device.
          </p>
          {picker}
        </section>
      ) : (
        <>
          <div class="aux-chat" aria-live="polite">
            {log.map((m, i) => (
              <div key={i} class={cx('aux-row', m.who)}>
                <div class="aux-bubble">
                  <span class="aux-text">
                    <Rich text={m.text} />
                  </span>
                </div>
              </div>
            ))}
            {busy && (
              <div class="aux-row aux">
                <div class="aux-bubble typing" aria-label="Auxilium is thinking">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            )}
            <div ref={bottom} />
          </div>

          {last?.chips && !busy && live === choice.key && (
            <div class="aux-chips">
              {last.chips.map((c) => (
                <button type="button" key={c} class="aux-chip" onClick={() => void send(c)}>
                  {c}
                </button>
              ))}
            </div>
          )}

          {live !== choice.key && (
            <div class="aux-load">
              {prog ? (
                <div class="qwen-progress" aria-live="polite">
                  <div class="family-bar">
                    <span style={{ width: `${Math.round(prog.p * 100)}%` }} />
                  </div>
                  <small class="muted">Loading {choice.name}… {Math.round(prog.p * 100)}%</small>
                </div>
              ) : (
                <button type="button" class="btn btn-primary" onClick={() => void load()}>
                  <Icon name="play" size={18} /> Load {choice.name} to start chatting
                </button>
              )}
              {error && <p class="save-msg bad">{error}</p>}
            </div>
          )}

          <form
            class="aux-input"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <input
              ref={field}
              value={input}
              onInput={(e) => setInput(e.currentTarget.value)}
              placeholder="Ask Auxilium…"
              aria-label="Message Auxilium"
              autoComplete="off"
              autoCapitalize="off"
              spellcheck={false}
            />
            <button type="submit" class="btn btn-primary" disabled={!input.trim() || busy || live !== choice.key}>
              <Icon name="arrow-right" size={18} />
              <span class="sr-only">Send</span>
            </button>
          </form>

          <section class="panel aux-ai">
            <div class="aux-model-row">
              <span class="muted small">
                AI model: <b>{choice.name}</b> · The AI can make mistakes, so check anything important in the Lexicon.
              </span>
              <button type="button" class="btn btn-ghost btn-sm" onClick={() => setShowModels(!showModels)}>
                <Icon name="sliders" size={14} /> {showModels ? 'Done' : 'Change model'}
              </button>
            </div>
            {showModels && picker}
          </section>
        </>
      )}
    </div>
  );
}
