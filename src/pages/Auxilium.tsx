import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { AudioButton, Rich } from '../components/ui';
import { cx, useTitle } from '../lib/hooks';
import {
  AI_SYSTEM,
  aiHints,
  START_CHIPS,
  WORDS,
  aiChat,
  aiModels,
  askQuestion,
  checkAnswer,
  localReply,
  nextQuestion,
  pickModel,
  type QuizQ,
  type Reply,
} from '../lib/auxilium';
import { LANG, greeting } from '../lang';
import { accountName } from '../lib/cloud';
import { MASTERED } from '../lib/mastery';
import { getProgress } from '../lib/progress';
import { DEFAULT_QWEN, QWEN_MODELS, formatSize, isDownloaded, loadQwen, qwenByKey, qwenChat, qwenSupport, removeQwen, type QwenModel } from '../lib/qwen';
import './auxilium.css';

interface Msg extends Reply {
  who: 'me' | 'aux';
  ai?: boolean;
}

const AI_KEY = 'latinlearn:auxilium-ai';
const QWEN_KEY = 'latinlearn:qwen-model';
const OLLAMA_KEY = 'latinlearn:use-ollama';

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
const IS_PHONE = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

function progressReply(): Reply {
  const p = getProgress();
  const practised = WORDS.filter((w) => w.id && p.words[w.id] !== undefined);
  if (!practised.length) return { text: 'You haven’t practised any words yet. Let’s start!', chips: ['Quiz me'] };
  const weak = practised.filter((w) => (p.words[w.id!] ?? 0) < 2).slice(0, 6);
  const mastered = practised.filter((w) => (p.words[w.id!] ?? 0) >= MASTERED).length;
  return {
    text:
      `You’ve practised **${practised.length}** words and mastered **${mastered}**. ` +
      (weak.length ? `Worth another look: ${weak.map((w) => `_${w.head}_ (${w.en})`).join(', ')}.` : 'No weak words right now. Euge!'),
    chips: ['Quiz me'],
  };
}

export function Auxilium() {
  useTitle('Auxilium');
  const [log, setLog] = useState<Msg[]>(() => [
    {
      who: 'aux',
      text: `_${accountName() ? `${greeting()[0]}, ${accountName()}!` : LANG.hello}_ I’m **Auxilium**, your ${LANG.language} practice buddy. I can quiz you, explain words, conjugate verbs and more. What shall we do?`,
      say: LANG.hello,
      chips: START_CHIPS,
    },
  ]);
  const [input, setInput] = useState('');
  const [quiz, setQuiz] = useState<QuizQ | null>(null);
  const [streak, setStreak] = useState(0);
  const [busy, setBusy] = useState(false);
  const [models, setModels] = useState<string[] | null | undefined>(undefined);
  const [model, setModel] = useState<string | undefined>();
  const [aiOn, setAiOn] = useState(() => read(AI_KEY) !== 'off');
  // Built-in AI: which Qwen model, which are downloaded, and download progress.
  const [gpu, setGpu] = useState<{ ok: boolean; f16: boolean } | undefined>();
  const [choice, setChoice] = useState<QwenModel>(() => qwenByKey(read(QWEN_KEY)) ?? DEFAULT_QWEN);
  const [have, setHave] = useState<Record<string, boolean>>({});
  const [prog, setProg] = useState<{ p: number; text: string } | null>(null);
  const [aiError, setAiError] = useState('');
  const [useOllama, setUseOllama] = useState(() => read(OLLAMA_KEY) === 'on');
  const bottom = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  const checkAi = async () => {
    const m = await aiModels();
    setModels(m);
    setModel(m?.length ? pickModel(m) : undefined);
  };
  // Ollama only runs on a PC, so phones don't look for it; every device checks for WebGPU (Qwen).
  useEffect(() => {
    if (IS_PHONE) setModels(null);
    else void checkAi();
    void qwenSupport().then(async (g) => {
      setGpu(g);
      if (!g.ok) return;
      const found = await Promise.all(QWEN_MODELS.map(async (m) => [m.key, await isDownloaded(m)] as const));
      setHave(Object.fromEntries(found));
    });
  }, []);

  const choose = (m: QwenModel) => {
    setChoice(m);
    setAiError('');
    store(QWEN_KEY, m.key);
  };
  const download = async (m: QwenModel) => {
    setAiError('');
    setProg({ p: 0, text: 'Starting the download…' });
    // Ask the browser to keep the model even when space runs low.
    void navigator.storage?.persist?.().catch(() => undefined);
    try {
      await loadQwen(m, (p, text) => setProg({ p, text }));
      setHave((h) => ({ ...h, [m.key]: true }));
      toggleAi(true);
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      setAiError(
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
  };
  const pickOllama = (on: boolean) => {
    setUseOllama(on);
    store(OLLAMA_KEY, on ? 'on' : 'off');
  };
  useEffect(() => bottom.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), [log.length, busy]);

  const ollamaReady = !!(useOllama && model);
  const qwenReady = !!(aiOn && gpu?.ok && have[choice.key]);
  const aiReady = ollamaReady || qwenReady;
  const aiName = ollamaReady ? model : choice.name;
  const toggleAi = (on: boolean) => {
    setAiOn(on);
    store(AI_KEY, on ? 'on' : 'off');
  };

  const add = (...msgs: Msg[]) => setLog((l) => [...l, ...msgs]);

  const startQuiz = () => {
    const q = nextQuestion();
    setQuiz(q);
    return { who: 'aux' as const, ...askQuestion(q) };
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setInput('');
    const me: Msg = { who: 'me', text };
    const low = text.toLowerCase();

    if (quiz) {
      if (/^(stop|stop quiz|quit|end|exit|finish)\b/.test(low)) {
        setQuiz(null);
        return add(me, { who: 'aux', text: `Quiz over. Best streak this time: **${streak}**. _${LANG.praise[0]}_ (Well done!)`, chips: START_CHIPS });
      }
      if (/^(skip|pass|i don.?t know|idk|\?)$/.test(low)) {
        const r = checkAnswer(quiz, '');
        setStreak(0);
        return add(me, { who: 'aux', text: r.reply.text.replace('Not quite: ', 'No problem: '), say: r.reply.say }, startQuiz());
      }
      const { correct, reply } = checkAnswer(quiz, text);
      const s = correct ? streak + 1 : 0;
      setStreak(s);
      const bonus = correct && s > 0 && s % 5 === 0 ? ` 🔥 **${s} in a row!**` : '';
      return add(me, { who: 'aux', ...reply, text: reply.text + bonus }, startQuiz());
    }

    const local = localReply(text);
    if (local === 'quiz') {
      setStreak(0);
      return add(me, { who: 'aux', text: 'Let’s go! Type your answer, or tap **Skip**. Say **stop** to finish.' }, startQuiz());
    }
    if (local === 'progress') return add(me, { who: 'aux', ...progressReply() });
    if (local) return add(me, { who: 'aux', ...local });

    if (aiReady) {
      add(me);
      setBusy(true);
      try {
        const history = [...log, me]
          .filter((m) => m.who === 'me' || m.ai)
          .map((m) => ({ role: m.who === 'me' ? ('user' as const) : ('assistant' as const), content: m.text }));
        const answer = ollamaReady ? await aiChat(model!, history) : await qwenChat(choice, AI_SYSTEM + aiHints(text), history);
        add({ who: 'aux', text: answer, ai: true });
      } catch {
        add({
          who: 'aux',
          text: ollamaReady
            ? 'The AI on your PC didn’t answer. Is Ollama still running? You can still use everything else here.'
            : `${choice.name} couldn’t answer on this device. Try a smaller model below. You can still use everything else here.`,
          chips: START_CHIPS,
        });
      } finally {
        setBusy(false);
        field.current?.focus();
      }
      return;
    }
    add(me, {
      who: 'aux',
      text:
        'I didn’t understand that one. Try “what does _canis_ mean?”, “how do you say dog?”, “conjugate _videō_”, or “quiz me”.' +
        ' (For open questions, download the free Auxilium AI below.)',
      chips: START_CHIPS,
    });
  };

  const last = log[log.length - 1];

  return (
    <div class="container aux-page">
      <header class="page-head aux-head">
        <span class="aux-avatar" aria-hidden="true">
          <Icon name="chat" size={26} />
        </span>
        <div>
          <p class="eyebrow">Your practice buddy</p>
          <h1>Auxilium</h1>
          <p class="muted">Works offline on any device. {aiReady ? `Open questions go to ${aiName}.` : ''}</p>
        </div>
      </header>

      <div class="aux-chat" aria-live="polite">
        {log.map((m, i) => (
          <div key={i} class={cx('aux-row', m.who)}>
            <div class={cx('aux-bubble', m.ai && 'ai')}>
              <span class="aux-text">
                <Rich text={m.text} />
              </span>
              {m.say && <AudioButton text={m.say} size="sm" />}
              {m.ai && <span class="aux-tag">AI</span>}
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

      {last?.chips && !busy && (
        <div class="aux-chips">
          {last.chips.map((c) => (
            <button type="button" key={c} class="aux-chip" onClick={() => void send(c)}>
              {c}
            </button>
          ))}
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
          placeholder={quiz ? 'Your answer…' : 'Ask Auxilium…'}
          aria-label={quiz ? 'Your answer' : 'Message Auxilium'}
          autoComplete="off"
          autoCapitalize="off"
          spellcheck={false}
        />
        <button type="submit" class="btn btn-primary" disabled={!input.trim() || busy}>
          <Icon name="arrow-right" size={18} />
          <span class="sr-only">Send</span>
        </button>
      </form>
      {quiz && (
        <div class="macron-keys" aria-label="Insert a long vowel">
          {['ā', 'ē', 'ī', 'ō', 'ū'].map((ch) => (
            <button type="button" key={ch} onClick={() => (setInput((v) => v + ch), field.current?.focus())}>
              {ch}
            </button>
          ))}
        </div>
      )}

      <section class="panel aux-ai">
        <h2 class="h-sm">
          <Icon name="sparkle" size={18} /> Auxilium AI (Qwen)
        </h2>
        <p class="muted small">
          Chat freely about {LANG.language}. Pick a Qwen model and download it once: it runs right here on this device, free and private,
          and works offline after that. Bigger models are smarter but need more space and a stronger device.
        </p>
        {gpu === undefined ? (
          <p class="muted">Checking what this device can run…</p>
        ) : !gpu.ok ? (
          <p class="muted small">
            This browser can’t run the AI on this device (it needs WebGPU). Try the latest Chrome or Edge, or Safari on iOS 26 or newer.
            {import.meta.env.MODE === 'play' ? ' The PC file can’t run it: open the online app instead.' : ''} Auxilium’s built-in tutor still
            works here.
          </p>
        ) : (
          <>
            <div class="qwen-list" role="radiogroup" aria-label="AI model">
              {QWEN_MODELS.map((m) => (
                <label key={m.key} class={cx('qwen-card', choice.key === m.key && 'on')}>
                  <input type="radio" name="qwen" checked={choice.key === m.key} disabled={!!prog} onChange={() => choose(m)} />
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
              <>
                <label class="switch-row">
                  <input type="checkbox" checked={aiOn} onChange={(e) => toggleAi(e.currentTarget.checked)} />
                  <span class="switch" aria-hidden="true" />
                  <span>Answer open questions with {choice.name}</span>
                </label>
                <div class="btn-row">
                  <button type="button" class="btn btn-ghost btn-sm" disabled={busy} onClick={() => void remove(choice)}>
                    <Icon name="trash" size={14} /> Remove download ({formatSize(choice.mb)})
                  </button>
                </div>
              </>
            ) : (
              <div class="btn-row">
                <button type="button" class="btn btn-primary" onClick={() => void download(choice)}>
                  <Icon name="download" size={18} /> Download {choice.name} ({formatSize(choice.mb)})
                </button>
              </div>
            )}
            {aiError && <p class="save-msg bad">{aiError}</p>}
          </>
        )}
        {models && models.length > 0 && (
          <label class="switch-row">
            <input type="checkbox" checked={useOllama} onChange={(e) => pickOllama(e.currentTarget.checked)} />
            <span class="switch" aria-hidden="true" />
            <span>Use Ollama on this PC instead ({model})</span>
          </label>
        )}
        <p class="muted small">The AI can make mistakes, so check anything important in the Lexicon.</p>
      </section>
    </div>
  );
}
