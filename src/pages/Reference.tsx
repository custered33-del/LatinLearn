import { L } from '../lang';
import type { JSX } from 'preact';
import { useMemo, useRef, useState } from 'preact/hooks';
import { COURSES, headOf } from '../data/courses';
import {
  ADJECTIVES,
  CASES,
  COMPARISON,
  CONSONANTS,
  DIPHTHONGS,
  GRAMMAR,
  LAB_SAMPLES,
  LEXICON,
  NOUNS,
  ORDINALS,
  PERSONAL_ENDINGS,
  PERSONS,
  PRONOUN_TABLES,
  SMALL_NUMBER_TABLES,
  STRESS_RULES,
  TENSES,
  VERBS,
  VOWELS,
  type AdjParadigm,
} from '../data/reference';
import { Icon, type IconName } from '../components/Icon';
import { AudioButton, DataTable, Form, Rich, Say } from '../components/ui';
import { cx, useTitle } from '../lib/hooks';
import { fold, headword, respell, stressIndex, syllabify } from '../lib/latin';
import { fromRoman, toLatinWords, toRoman } from '../lib/numerals';
import { useAudioSettings, useVoiceReady, voiceFor } from '../lib/speech';
import { href } from '../router';
import './reference.css';

const TABS: { id: string; label: string; icon: IconName }[] = [
  { id: 'words', label: 'Words', icon: 'book' },
  { id: 'sounds', label: 'Pronunciation', icon: 'wave' },
  { id: 'nouns', label: 'Nouns', icon: 'grid' },
  { id: 'adjectives', label: 'Adjectives', icon: 'sparkle' },
  { id: 'verbs', label: 'Verbs', icon: 'refresh' },
  { id: 'pronouns', label: 'Pronouns', icon: 'target' },
  { id: 'numbers', label: 'Numbers', icon: 'clock' },
  { id: 'grammar', label: 'Grammar', icon: 'bulb' },
];

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

interface Entry {
  la: string;
  head: string;
  en: string;
  pos: string;
  cat: string;
  fla: string;
  fen: string;
}

const COURSE_HEADS = new Set(COURSES.flatMap((c) => c.vocab.map((v) => fold(headOf(v)))));

const ENTRIES: Entry[] = [
  ...COURSES.flatMap((c) => c.vocab.map((v) => ({ la: v.la, head: headOf(v), en: v.en, pos: v.pos, cat: c.title }))),
  // Skip Lexicon words a course already teaches.
  ...LEXICON.filter(([la]) => !COURSE_HEADS.has(fold(headword(la)))).map(([la, en, pos, cat]) => ({ la, head: headword(la), en, pos, cat })),
].map((e) => ({ ...e, fla: fold(e.la), fen: e.en.toLowerCase() }));

const CATEGORIES = ['All', ...new Set(ENTRIES.map((e) => e.cat))];
const PAGE = 80;

function WordsTab() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [limit, setLimit] = useState(PAGE);

  const results = useMemo(() => {
    const f = fold(q.trim());
    const list = ENTRIES.filter((e) => (cat === 'All' || e.cat === cat) && (!f || e.fla.includes(f) || e.fen.includes(f)));
    const rank = (e: Entry) => (!f ? 0 : fold(e.head) === f || e.fen === f ? 0 : e.fla.startsWith(f) || e.fen.startsWith(f) ? 1 : 2);
    return list.sort((a, b) => rank(a) - rank(b) || a.fla.localeCompare(b.fla));
  }, [q, cat]);

  const update = (fn: () => void) => {
    fn();
    setLimit(PAGE);
  };

  return (
    <div>
      <div class="lex-controls">
        <label class="search">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={q}
            onInput={(e) => update(() => setQ((e.currentTarget as HTMLInputElement).value))}
            placeholder="Search Latin or English…"
            aria-label="Search the dictionary"
          />
        </label>
        <p class="muted small" aria-live="polite">
          {results.length} of {ENTRIES.length} entries
        </p>
      </div>
      <div class="chip-row" role="group" aria-label="Filter by category">
        {CATEGORIES.map((c) => (
          <button type="button" key={c} class={cx('filter-chip', c === cat && 'on')} aria-pressed={c === cat} onClick={() => update(() => setCat(c))}>
            {c}
          </button>
        ))}
      </div>
      {results.length === 0 ? (
        <p class="empty">
          No matches for “{q}”. Try fewer letters, or search in English.
        </p>
      ) : (
        <ul class="lex-list">
          {results.slice(0, limit).map((e) => (
            <li class="lex-row" key={`${e.cat}|${e.la}|${e.en}`}>
              <div class="lex-main">
                <span class="lex-la" lang={L}>
                  {e.la}
                </span>
                <span class="lex-en">{e.en}</span>
              </div>
              <div class="lex-tags">
                <span class="tag">{e.pos}</span>
                <span class="tag tag-cat">{e.cat}</span>
              </div>
              <AudioButton text={e.head} size="sm" />
            </li>
          ))}
        </ul>
      )}
      {results.length > limit && (
        <button type="button" class="btn btn-ghost show-more" onClick={() => setLimit(limit + PAGE)}>
          Show more ({results.length - limit} left)
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pronunciation
// ---------------------------------------------------------------------------

function LabVoiceNote({ text }: { text: string }) {
  const audio = useAudioSettings();
  if (audio.voice === 'browser') return null;
  const used = voiceFor(text);
  return (
    <p class="lab-note muted">
      <Icon name={used === 'latin' ? 'headphones' : 'info'} size={16} />
      {used === 'latin'
        ? 'Read by the LatinLearn voice.'
        : 'Some of these words aren’t in the LatinLearn voice’s recordings yet, so your browser’s voice reads this one.'}
    </p>
  );
}

function PronunciationLab() {
  const voiceReady = useVoiceReady();
  const [text, setText] = useState('vēnī, vīdī, vīcī');
  const ref = useRef<HTMLInputElement>(null);
  const words = text.split(/[\s,.;!?]+/).filter(Boolean);

  const insert = (ch: string) => {
    const el = ref.current;
    const s = el?.selectionStart ?? text.length;
    const e = el?.selectionEnd ?? text.length;
    setText(text.slice(0, s) + ch + text.slice(e));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(s + 1, s + 1);
    });
  };

  return (
    <section class="lab" aria-labelledby="lab-h">
      <h2 id="lab-h" class="h-md">
        <Icon name="sparkle" size={22} /> Pronunciation lab
      </h2>
      <p class="muted">Type any Latin word or phrase. Add macrons (long marks) for accurate stress.</p>
      <div class="lab-input">
        <input
          ref={ref}
          value={text}
          onInput={(e) => setText((e.currentTarget as HTMLInputElement).value)}
          aria-label="Latin text to pronounce"
          lang={L}
          spellcheck={false}
          autoCapitalize="off"
        />
        <AudioButton text={text} size="lg" />
      </div>
      {voiceReady && words.length > 0 && <LabVoiceNote text={text} />}
      <div class="macron-row">
        {['ā', 'ē', 'ī', 'ō', 'ū'].map((m) => (
          <button type="button" key={m} class="macron" onClick={() => insert(m)} aria-label={`Insert ${m}`}>
            {m}
          </button>
        ))}
        <span class="muted small">Try:</span>
        {LAB_SAMPLES.map((s) => (
          <button type="button" key={s} class="filter-chip" onClick={() => setText(s)} lang={L}>
            {s}
          </button>
        ))}
      </div>
      {words.length > 0 && (
        <div class="lab-out">
          {words.map((w, i) => {
            const sylls = syllabify(w);
            const stress = stressIndex(sylls);
            const parts = respell(w).split('-');
            return (
              <div class="lab-word" key={i}>
                <span class="la" lang={L}>
                  {w}
                </span>
                <span class="lab-syll" aria-label={respell(w)}>
                  {parts.map((part, k) => (
                    <span key={k} class={cx('syll', k === stress && 'stressed', sylls[k]?.heavy && 'heavy')}>
                      {part.toLowerCase()}
                    </span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <p class="muted small">Underlined syllables are long (heavy); the highlighted one takes the stress.</p>
    </section>
  );
}

function SoundsTab() {
  return (
    <div class="stack">
      <p class="lede-sm">
        LatinLearn teaches the <b>restored classical pronunciation</b>: how educated Romans spoke in the time of Cicero and Caesar. Every
        letter is pronounced, and it always makes the same sound.
      </p>
      <PronunciationLab />
      <div class="two-col">
        <section>
          <h2 class="h-md">Vowels</h2>
          <DataTable table={VOWELS} caption="Vowels" />
          <p class="muted small">
            A macron (ā) marks a long vowel: held for about twice as long. Length can change meaning: <span class="la">malum</span> (bad
            thing) vs <span class="la">mālum</span> (apple).
          </p>
        </section>
        <section>
          <h2 class="h-md">Diphthongs</h2>
          <DataTable table={DIPHTHONGS} caption="Diphthongs" />
          <p class="muted small">Two vowels glided together into one syllable.</p>
        </section>
      </div>
      <section>
        <h2 class="h-md">Consonants</h2>
        <DataTable table={CONSONANTS} caption="Consonants" />
      </section>
      <section>
        <h2 class="h-md">Where the stress falls</h2>
        <ol class="rules">
          {STRESS_RULES.map((r) => (
            <li key={r.rule}>
              <p>{r.rule}</p>
              <p class="rule-ex">
                {r.examples.map((w) => (
                  <span key={w} class="rule-word">
                    <span class="la" lang={L}>
                      {w}
                    </span>
                    <Say text={w} />
                    <AudioButton text={w} size="sm" />
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nouns, adjectives, verbs
// ---------------------------------------------------------------------------

function NounsTab() {
  return (
    <div class="stack">
      <section>
        <h2 class="h-md">The six cases</h2>
        <p class="muted">A noun’s ending shows its job in the sentence. Each job is a case.</p>
        <div class="case-grid">
          {CASES.map((c) => (
            <article class="case-card" key={c.name}>
              <h3>
                {c.name} <span class="muted">{c.abbr}</span>
              </h3>
              <p>{c.job}</p>
              <p class="case-ex">
                <span class="la" lang={L}>
                  {c.ex[0]}
                </span>
                <span class="muted">{c.ex[1]}</span>
              </p>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2 class="h-md">Declensions</h2>
        <p class="muted">Nouns fall into five families (declensions). Endings are highlighted.</p>
        <div class="para-grid">
          {NOUNS.map((n) => (
            <article class="para" key={n.title}>
              <h3>{n.title}</h3>
              <p class="para-word">
                <span class="la" lang={L}>
                  {n.word}
                </span>{' '}
                · {n.meaning}
              </p>
              <table class="data para-table">
                <caption class="sr-only">
                  {n.title}: {n.word}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Case</th>
                    <th scope="col">Singular</th>
                    <th scope="col">Plural</th>
                  </tr>
                </thead>
                <tbody>
                  {CASES.map((c, i) => (
                    <tr key={c.name}>
                      <th scope="row" title={c.name}>
                        {c.abbr}
                      </th>
                      <td class="la">
                        <Form f={n.sg[i]} />
                      </td>
                      <td class="la">
                        <Form f={n.pl[i]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {n.note && <p class="muted small">{n.note}</p>}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function AdjTable({ a, number }: { a: AdjParadigm; number: 'sg' | 'pl' }) {
  return (
    <div class="table-wrap">
      <table class="data">
        <caption class="sr-only">
          {a.word}, {number === 'sg' ? 'singular' : 'plural'}
        </caption>
        <thead>
          <tr>
            <th scope="col">{number === 'sg' ? 'Singular' : 'Plural'}</th>
            <th scope="col">Masc.</th>
            <th scope="col">Fem.</th>
            <th scope="col">Neut.</th>
          </tr>
        </thead>
        <tbody>
          {CASES.map((c, i) => (
            <tr key={c.name}>
              <th scope="row" title={c.name}>
                {c.abbr}
              </th>
              {a[number][i].map((f, k) => (
                <td class="la" key={k}>
                  <Form f={f} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdjectivesTab() {
  return (
    <div class="stack">
      <p class="lede-sm">
        Adjectives agree with their noun in <b>gender</b>, <b>number</b> and <b>case</b>. Most use one of these two patterns.
      </p>
      <div class="para-grid wide">
        {ADJECTIVES.map((a) => (
          <article class="para" key={a.title}>
            <h3>{a.title}</h3>
            <p class="para-word">
              <span class="la" lang={L}>
                {a.word}
              </span>{' '}
              · {a.meaning}
            </p>
            <AdjTable a={a} number="sg" />
            <AdjTable a={a} number="pl" />
          </article>
        ))}
      </div>
      <section>
        <h2 class="h-md">Comparing: -ior and -issimus</h2>
        <p class="muted">
          Add <b>-ior</b> for “more” and <b>-issimus</b> for “most / very”. The most common adjectives are irregular, just like good,
          better, best in English.
        </p>
        <DataTable table={COMPARISON} caption="Comparison of adjectives" />
      </section>
    </div>
  );
}

function VerbsTab() {
  const [id, setId] = useState(VERBS[0].id);
  const verb = VERBS.find((v) => v.id === id)!;
  return (
    <div class="stack">
      <p class="lede-sm">
        Verbs change their ending to show <b>who</b> is doing the action and <b>when</b>. Pick a verb to see its full table.
      </p>
      <div class="chip-row" role="group" aria-label="Choose a verb">
        {VERBS.map((v) => (
          <button type="button" key={v.id} class={cx('filter-chip', v.id === id && 'on')} aria-pressed={v.id === id} onClick={() => setId(v.id)} lang={L}>
            {headword(v.parts)}
          </button>
        ))}
      </div>
      <article class="para verb-card">
        <div class="verb-head">
          <div>
            <p class="eyebrow">{verb.group}</p>
            <h3 class="la" lang={L}>
              {verb.parts}
            </h3>
            <p class="muted">{verb.meaning}</p>
          </div>
          <dl class="verb-meta">
            <div>
              <dt>Infinitive</dt>
              <dd class="la" lang={L}>
                {verb.inf}
              </dd>
            </div>
            <div>
              <dt>Commands</dt>
              <dd class="la" lang={L}>
                {verb.imp[0]} / {verb.imp[1]}
              </dd>
            </div>
          </dl>
        </div>
        <div class="table-wrap">
          <table class="data verb-table">
            <caption class="sr-only">Conjugation of {verb.parts}</caption>
            <thead>
              <tr>
                <th scope="col">Person</th>
                {TENSES.map((t) => (
                  <th scope="col" key={t.id}>
                    {t.label}
                    <span class="th-sub">{verb.english[t.id]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERSONS.map((p, i) => (
                <tr key={p}>
                  <th scope="row">{p}</th>
                  {TENSES.map((t) => (
                    <td class="la" key={t.id}>
                      <Form f={verb.forms[t.id][i]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      <section>
        <h2 class="h-md">Personal endings</h2>
        <p class="muted">Learn these once and you can read almost any verb.</p>
        <DataTable table={PERSONAL_ENDINGS} caption="Personal endings" />
      </section>
    </div>
  );
}

function PronounsTab() {
  return (
    <div class="para-grid wide">
      {PRONOUN_TABLES.map((t) => (
        <article class="para" key={t.title}>
          <h3>{t.title}</h3>
          <DataTable table={t.table} caption={t.title} />
          {t.note && <p class="muted small">{t.note}</p>}
        </article>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

function Converter() {
  const [input, setInput] = useState('2026');
  const trimmed = input.trim();
  const n = /^\d+$/.test(trimmed) ? Number(trimmed) : fromRoman(trimmed);
  const valid = n !== null && n >= 1 && n <= 3999;
  const words = valid ? toLatinWords(n) : '';

  return (
    <section class="converter" aria-labelledby="conv-h">
      <h2 id="conv-h" class="h-md">
        <Icon name="swap" size={22} /> Number converter
      </h2>
      <p class="muted">Type a number (1–3999) or a Roman numeral.</p>
      <input
        class="conv-input"
        value={input}
        onInput={(e) => setInput((e.currentTarget as HTMLInputElement).value)}
        aria-label="Number or Roman numeral"
        inputMode="text"
        autoCapitalize="characters"
        spellcheck={false}
      />
      <div class="conv-out" aria-live="polite">
        {valid ? (
          <>
            <div>
              <span class="conv-label">Number</span>
              <span class="conv-val">{n}</span>
            </div>
            <div>
              <span class="conv-label">Numeral</span>
              <span class="conv-val">{toRoman(n)}</span>
            </div>
            <div class="conv-words">
              <span class="conv-label">In Latin</span>
              <span class="conv-val la" lang={L}>
                {words} <AudioButton text={words} size="sm" />
              </span>
            </div>
          </>
        ) : (
          <p class="muted">{trimmed ? 'That isn’t a number from 1 to 3999 or a standard Roman numeral.' : 'Waiting for a number…'}</p>
        )}
      </div>
    </section>
  );
}

const range = (from: number, to: number, step = 1) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

function NumberTable({ nums, caption }: { nums: number[]; caption: string }) {
  return (
    <div class="table-wrap">
      <table class="data">
        <caption class="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Numeral</th>
            <th scope="col">Latin</th>
            <th scope="col">
              <span class="sr-only">Listen</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {nums.map((n) => (
            <tr key={n}>
              <th scope="row">{n}</th>
              <td class="numeral-cell">{toRoman(n)}</td>
              <td class="la" lang={L}>
                {toLatinWords(n)}
              </td>
              <td class="audio-cell">
                <AudioButton text={toLatinWords(n)} size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NumbersTab() {
  return (
    <div class="stack">
      <Converter />
      <div class="two-col">
        <section>
          <h2 class="h-md">1 to 20</h2>
          <NumberTable nums={range(1, 20)} caption="Numbers 1 to 20" />
        </section>
        <section class="stack">
          <div>
            <h2 class="h-md">Tens</h2>
            <NumberTable nums={range(10, 100, 10)} caption="Tens" />
          </div>
          <div>
            <h2 class="h-md">Hundreds and thousands</h2>
            <NumberTable nums={[...range(200, 900, 100), 1000, 2000]} caption="Hundreds and thousands" />
          </div>
        </section>
      </div>
      <section>
        <h2 class="h-md">Ordinals: first, second, third…</h2>
        <p class="muted">Ordinals are ordinary -us, -a, -um adjectives: prīma lūx (first light), secundus diēs (the second day).</p>
        <div class="ordinal-grid">
          {ORDINALS.map(([n, w]) => (
            <div class="ordinal" key={n}>
              <span class="muted">{n}.</span>
              <span class="la" lang={L}>
                {w}
              </span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 class="h-md">1, 2 and 3 decline</h2>
        <div class="para-grid">
          {SMALL_NUMBER_TABLES.map((t) => (
            <article class="para" key={t.title}>
              <h3>{t.title}</h3>
              <DataTable table={t.table} caption={t.title} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function GrammarTab() {
  return (
    <div class="idea-grid">
      {GRAMMAR.map((g) => (
        <article class="idea" key={g.title}>
          <h3>{g.title}</h3>
          <p>
            <Rich text={g.body} />
          </p>
          {g.table && <DataTable table={g.table} caption={g.title} />}
        </article>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

const PANELS: Record<string, () => JSX.Element> = {
  words: WordsTab,
  sounds: SoundsTab,
  nouns: NounsTab,
  adjectives: AdjectivesTab,
  verbs: VerbsTab,
  pronouns: PronounsTab,
  numbers: NumbersTab,
  grammar: GrammarTab,
};

export function Reference({ tab }: { tab?: string }) {
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const Panel = PANELS[active.id];
  useTitle(`${active.label} · Lexicon`);

  return (
    <div class="container ref">
      <header class="page-head">
        <p class="eyebrow">The Lexicon</p>
        <h1>Latin reference</h1>
        <p class="lede-sm">
          All {ENTRIES.length} words from the courses and beyond, with declension and conjugation tables, grammar rules, a number
          converter and a pronunciation lab.
        </p>
      </header>
      <nav class="ref-tabs" aria-label="Reference sections">
        {TABS.map((t) => (
          <a key={t.id} href={href('reference', t.id)} aria-current={t.id === active.id ? 'page' : undefined}>
            <Icon name={t.icon} size={16} />
            {t.label}
          </a>
        ))}
      </nav>
      <div class="ref-body" key={active.id}>
        <Panel />
      </div>
    </div>
  );
}
