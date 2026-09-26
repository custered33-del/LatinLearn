import { L, LANG, LANG_ID } from '../lang';
import type { JSX } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { COURSES, headOf } from '../data/courses';
import { loadRef } from '../data/ref';
import type { LangRef } from '../data/types';
import { Icon, type IconName } from '../components/Icon';
import { AudioButton, DataTable, Rich, Say, Spinner } from '../components/ui';
import { cx, useTitle } from '../lib/hooks';
import { fold } from '../lib/latin';
import { href } from '../router';
import './reference.css';

/** The Lexicon for German, Spanish and French: words, sounds, verbs, numbers and grammar. */

const TABS: { id: string; label: string; icon: IconName }[] = [
  { id: 'words', label: 'Words', icon: 'book' },
  { id: 'sounds', label: 'Pronunciation', icon: 'wave' },
  { id: 'verbs', label: 'Verbs', icon: 'refresh' },
  { id: 'numbers', label: 'Numbers', icon: 'clock' },
  { id: 'grammar', label: 'Grammar', icon: 'bulb' },
];

const PAGE = 60;

interface Entry {
  la: string;
  head: string;
  en: string;
  pos: string;
  cat: string;
  fla: string;
  fen: string;
}

const ENTRIES: Entry[] = (() => {
  const seen = new Set<string>();
  const out: Entry[] = [];
  for (const c of COURSES) {
    for (const v of c.vocab) {
      const k = `${v.la}|${v.en}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ la: v.la, head: headOf(v), en: v.en, pos: v.pos, cat: c.title, fla: fold(v.la), fen: fold(v.en) });
    }
  }
  return out;
})();

const CATEGORIES = ['All', ...COURSES.map((c) => c.title)];

function WordsTab() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [limit, setLimit] = useState(PAGE);
  const results = useMemo(() => {
    const f = fold(q.trim());
    return ENTRIES.filter((e) => (cat === 'All' || e.cat === cat) && (!f || e.fla.includes(f) || e.fen.includes(f))).sort(
      (a, b) => a.fla.localeCompare(b.fla),
    );
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
            placeholder={`Search ${LANG.language} or English…`}
            aria-label="Search the dictionary"
          />
        </label>
        <p class="muted small" aria-live="polite">
          {results.length} of {ENTRIES.length} entries
        </p>
      </div>
      <div class="chip-row" role="group" aria-label="Filter by course">
        {CATEGORIES.map((c) => (
          <button type="button" key={c} class={cx('filter-chip', c === cat && 'on')} aria-pressed={c === cat} onClick={() => update(() => setCat(c))}>
            {c}
          </button>
        ))}
      </div>
      {results.length === 0 ? (
        <p class="empty">No matches for “{q}”. Try fewer letters, or search in English.</p>
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

function SoundsTab() {
  return (
    <div class="stack">
      {COURSES.filter((c) => c.sounds.length).map((c) => (
        <section key={c.id}>
          <h2 class="h-md">{c.title}</h2>
          <div class="para-grid">
            {c.sounds.map((s) => (
              <article class="para" key={s.sound}>
                <h3 lang={L}>{s.sound}</h3>
                <p class="muted">
                  <Rich text={s.like} />
                </p>
                <ul class="lex-list">
                  {s.words.map((w) => (
                    <li class="lex-row" key={w}>
                      <div class="lex-main">
                        <span class="lex-la" lang={L}>
                          {w}
                        </span>
                        <Say text={w} />
                      </div>
                      <AudioButton text={w} size="sm" />
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function VerbsTab({ data: ref }: { data: LangRef }) {
  const [id, setId] = useState(ref.verbs[0]?.id ?? '');
  const v = ref.verbs.find((x) => x.id === id) ?? ref.verbs[0];
  if (!v) return <p class="empty">No verb tables yet.</p>;
  return (
    <div class="stack">
      <div class="chip-row" role="group" aria-label="Pick a verb">
        {ref.verbs.map((x) => (
          <button type="button" key={x.id} class={cx('filter-chip', x.id === v.id && 'on')} aria-pressed={x.id === v.id} onClick={() => setId(x.id)}>
            <span lang={L}>{x.inf}</span>
          </button>
        ))}
      </div>
      <h2 class="h-md">
        <span lang={L}>{v.inf}</span> <span class="muted">· {v.meaning}</span> <AudioButton text={v.inf} size="sm" />
      </h2>
      <div class="para-grid">
        {ref.tenses.map((t) => (
          <article class="para" key={t.id}>
            <h3>{t.label}</h3>
            <DataTable
              caption={`${v.inf}, ${t.label}`}
              table={{ head: ['', LANG.language], rows: ref.persons.map((p, i) => [person(p, v.forms[t.id]?.[i] ?? ''), v.forms[t.id]?.[i] ?? '']), la: [1] }}
            />
          </article>
        ))}
      </div>
    </div>
  );
}

/** French elides “je” before a vowel: j’ai, j’aime. */
const person = (p: string, form: string) => (LANG_ID === 'fr' && p === 'je' && /^[aeéèêiîouh]/i.test(form) ? 'j’' : p);

const range = (a: number, b: number, step = 1) => Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step);

function NumberList({ data: ref, nums }: { data: LangRef; nums: number[] }) {
  return (
    <ul class="lex-list">
      {nums.map((n) => (
        <li class="lex-row" key={n}>
          <div class="lex-main">
            <span class="lex-en">{n}</span>
            <span class="lex-la" lang={L}>
              {ref.numberWords(n)}
            </span>
          </div>
          <AudioButton text={ref.numberSpeech(n)} size="sm" />
        </li>
      ))}
    </ul>
  );
}

function NumbersTab({ data: ref }: { data: LangRef }) {
  const [raw, setRaw] = useState('2026');
  const n = Number(raw);
  const ok = Number.isInteger(n) && n >= 1 && n <= 9999;
  return (
    <div class="stack">
      <section class="panel">
        <h2 class="h-md">Number converter</h2>
        <label class="search">
          <input
            type="number"
            min={1}
            max={9999}
            value={raw}
            onInput={(e) => setRaw((e.currentTarget as HTMLInputElement).value)}
            aria-label="Type a number from 1 to 9999"
          />
        </label>
        {ok ? (
          <p class="lex-row">
            <span class="lex-la" lang={L}>
              {ref.numberWords(n)}
            </span>
            <AudioButton text={ref.numberSpeech(n)} size="sm" />
          </p>
        ) : (
          <p class="muted">Type a whole number from 1 to 9999.</p>
        )}
      </section>
      <div class="two-col">
        <section>
          <h2 class="h-md">1 to 20</h2>
          <NumberList data={ref} nums={range(1, 20)} />
        </section>
        <section>
          <h2 class="h-md">Tens, hundreds and thousands</h2>
          <NumberList data={ref} nums={[...range(30, 90, 10), 100, 200, 500, 1000, 2000]} />
        </section>
      </div>
    </div>
  );
}

function GrammarTab() {
  return (
    <div class="stack">
      {COURSES.map((c) => (
        <section key={c.id}>
          <h2 class="h-md">{c.title}</h2>
          <div class="para-grid">
            {c.ideas.map((k) => (
              <article class="para" key={k.title}>
                <h3>{k.title}</h3>
                <p>
                  <Rich text={k.body} />
                </p>
                {k.table && <DataTable table={k.table} caption={k.title} />}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function RefModern({ tab }: { tab?: string }) {
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const [ref, setRef] = useState<LangRef | null>(null);
  useEffect(() => void loadRef(LANG_ID).then(setRef), []);
  useTitle(`${active.label} · Lexicon`);

  let panel: JSX.Element;
  if (active.id === 'words') panel = <WordsTab />;
  else if (active.id === 'sounds') panel = <SoundsTab />;
  else if (active.id === 'grammar') panel = <GrammarTab />;
  else if (!ref) panel = <Spinner label="Loading tables" />;
  else panel = active.id === 'verbs' ? <VerbsTab data={ref} /> : <NumbersTab data={ref} />;

  return (
    <div class="container ref">
      <header class="page-head">
        <p class="eyebrow">The Lexicon</p>
        <h1>{LANG.language} reference</h1>
        <p class="lede-sm">
          All {ENTRIES.length} words from the courses, with pronunciation tips, verb tables, a number converter and every grammar idea in one
          place.
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
        {panel}
      </div>
    </div>
  );
}
