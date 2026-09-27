import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { AudioButton, Rich } from '../components/ui';
import { cx, useTitle } from '../lib/hooks';
import {
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
import './auxilium.css';

interface Msg extends Reply {
  who: 'me' | 'aux';
  ai?: boolean;
}

const AI_KEY = 'latinlearn:auxilium-ai';
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
  const [aiOn, setAiOn] = useState(() => {
    try {
      return localStorage.getItem(AI_KEY) !== 'off';
    } catch {
      return true;
    }
  });
  const bottom = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  const [checking, setChecking] = useState(false);
  const checkAi = async () => {
    setChecking(true);
    const m = await aiModels();
    setModels(m);
    setModel(m?.length ? pickModel(m) : undefined);
    setChecking(false);
  };
  // The AI only ever runs on the learner's own computer, so phones don't look for it unless asked.
  useEffect(() => {
    if (IS_PHONE) setModels(null);
    else void checkAi();
  }, []);
  useEffect(() => bottom.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), [log.length, busy]);

  const aiReady = !!(aiOn && model);
  const toggleAi = (on: boolean) => {
    setAiOn(on);
    try {
      localStorage.setItem(AI_KEY, on ? 'on' : 'off');
    } catch {
      /* ignore */
    }
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
        const answer = await aiChat(model!, history);
        add({ who: 'aux', text: answer, ai: true });
      } catch {
        add({ who: 'aux', text: 'The local AI didn’t answer. Is Ollama still running? You can still use everything else here.', chips: START_CHIPS });
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
        (models === null ? ' (For open questions, connect a local AI on your PC: see below.)' : ''),
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
          <p class="muted">Works offline on any device. {aiReady ? `Open questions go to the local AI (${model}).` : ''}</p>
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
              {m.ai && <span class="aux-tag">local AI</span>}
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
          <Icon name="sparkle" size={18} /> Local AI (PC only, optional)
        </h2>
        <p class="muted small">
          {aiReady
            ? `Using ${model} on this computer.`
            : 'Not connected, so Auxilium uses its built-in tutor (works everywhere, even offline).'}
        </p>
        <div class="btn-row">
          <button type="button" class="btn btn-ghost btn-sm" onClick={() => void checkAi()} disabled={checking}>
            <Icon name="refresh" size={14} /> {checking ? 'Checking…' : 'Check for local AI'}
          </button>
        </div>
        {models === undefined ? (
          <p class="muted">Looking for a local AI on this computer…</p>
        ) : models && models.length ? (
          <>
            <label class="switch-row">
              <input type="checkbox" checked={aiOn} onChange={(e) => toggleAi(e.currentTarget.checked)} />
              <span class="switch" aria-hidden="true" />
              <span>Answer open questions with the AI on this PC</span>
            </label>
            <label class="aux-model">
              Model{' '}
              <select value={model} onChange={(e) => setModel(e.currentTarget.value)}>
                {models.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <p class="muted small">It runs on your own computer through Ollama: free, private, nothing sent to the internet. The AI can make mistakes, so check anything important in the Lexicon.</p>
          </>
        ) : (
          <p class="muted small">
            No local AI found{IS_PHONE ? ' (phones use the built-in tutor)' : ''}. To chat freely about {LANG.language} on your PC, install the free{' '}
            <a href="https://ollama.com" target="_blank" rel="noreferrer">
              Ollama
            </a>{' '}
            app, run <code>ollama pull qwen2.5:7b</code>, and (for the online version) double-click <b>Allow Auxilium AI.cmd</b> in the
            LatinLearn folder once.
          </p>
        )}
      </section>
    </div>
  );
}
