import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { AudioButton, Rich } from '../components/ui';
import { cx, useTitle } from '../lib/hooks';
import {
  START_CHIPS,
  WORDS,
  askQuestion,
  checkAnswer,
  localReply,
  nextQuestion,
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
}

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
  const bottom = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => bottom.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), [log.length]);

  const add = (...msgs: Msg[]) => setLog((l) => [...l, ...msgs]);

  const startQuiz = () => {
    const q = nextQuestion();
    setQuiz(q);
    return { who: 'aux' as const, ...askQuestion(q) };
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text) return;
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

    add(me, {
      who: 'aux',
      text:
        'I didn’t understand that one. Try “what does _canis_ mean?”, “how do you say dog?”, “conjugate _videō_”, or “quiz me”.',
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
          <p class="muted">Works offline on any device.</p>
        </div>
      </header>

      <div class="aux-chat" aria-live="polite">
        {log.map((m, i) => (
          <div key={i} class={cx('aux-row', m.who)}>
            <div class="aux-bubble">
              <span class="aux-text">
                <Rich text={m.text} />
              </span>
              {m.say && <AudioButton text={m.say} size="sm" />}
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {last?.chips && (
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
        <button type="submit" class="btn btn-primary" disabled={!input.trim()}>
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

    </div>
  );
}
