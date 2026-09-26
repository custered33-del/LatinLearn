import { headOf } from '../data/courses';
import type { Course, VocabItem } from '../data/types';
import { Icon } from '../components/Icon';
import { AudioButton, DataTable, Rich, Say } from '../components/ui';
import { actions, courseOf, useProgress } from '../lib/progress';
import { ttsSupported } from '../lib/speech';
import { navigate } from '../router';
import { NextLink } from './Course';

function VocabCard({ v, i }: { v: VocabItem; i: number }) {
  const head = headOf(v);
  return (
    <article class="vocab-card" style={{ '--i': i }}>
      {v.swatch && <span class="swatch-bar" style={{ background: v.swatch }} aria-hidden="true" />}
      <div class="v-head">
        <div>
          <h3 class="v-la" lang="la">
            {head}
          </h3>
          <Say text={head} />
        </div>
        <AudioButton text={head} />
      </div>
      <p class="v-en">
        {v.swatch && <span class="swatch-dot" style={{ background: v.swatch }} aria-hidden="true" />}
        {v.en}
        {v.numeral && <span class="numeral">{v.numeral}</span>}
      </p>
      <p class="v-meta">
        <span class="tag">{v.pos}</span>
        {v.la !== head && (
          <span class="v-dict" lang="la">
            {v.la}
          </span>
        )}
      </p>
      {v.note && <p class="v-note">{v.note}</p>}
      {v.ex && (
        <div class="v-ex">
          <p>
            <span class="la" lang="la">
              {v.ex[0]}
            </span>
            <AudioButton text={v.ex[0]} size="sm" />
          </p>
          <p class="muted">{v.ex[1]}</p>
        </div>
      )}
    </article>
  );
}

export function Learn({ course }: { course: Course }) {
  const p = useProgress();
  const done = !!courseOf(p, course.id).steps.learn;

  const finish = () => {
    actions.completeStep(course.id, 'learn', 20);
    navigate('course', course.id, 'flashcards');
  };

  return (
    <div class="learn">
      <header class="page-head">
        <p class="eyebrow">Step 1 · Learn</p>
        <h1>{course.title}</h1>
        <p class="lede-sm">{course.blurb}</p>
        <p class="hint">
          <Icon name="info" size={16} />
          <span>
            {ttsSupported ? 'Tap the speaker to hear a word. ' : ''}
            In each respelling the stressed syllable is in <b>CAPITALS</b>.
          </span>
        </p>
      </header>

      <section aria-labelledby="sounds-h" class="block">
        <h2 id="sounds-h" class="h-md">
          <Icon name="wave" size={22} /> Sounds to know
        </h2>
        <div class="sound-grid">
          {course.sounds.map((s) => (
            <div class="sound-card" key={s.sound}>
              <span class="sound-glyph" lang="la">
                {s.sound}
              </span>
              <p>{s.like}</p>
              <ul>
                {s.words.map((w) => (
                  <li key={w}>
                    <span class="la" lang="la">
                      {w}
                    </span>
                    <Say text={w} />
                    <AudioButton text={w} size="sm" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="vocab-h" class="block">
        <h2 id="vocab-h" class="h-md">
          <Icon name="book" size={22} /> Vocabulary <span class="count">{course.vocab.length}</span>
        </h2>
        <div class="vocab-grid stagger">
          {course.vocab.map((v, i) => (
            <VocabCard key={v.id} v={v} i={i} />
          ))}
        </div>
      </section>

      <section aria-labelledby="ideas-h" class="block">
        <h2 id="ideas-h" class="h-md">
          <Icon name="bulb" size={22} /> Key ideas
        </h2>
        <div class="idea-grid">
          {course.ideas.map((idea) => (
            <article class="idea" key={idea.title}>
              <h3>{idea.title}</h3>
              <p>
                <Rich text={idea.body} />
              </p>
              {idea.table && <DataTable table={idea.table} caption={idea.title} />}
            </article>
          ))}
        </div>
      </section>

      <div class="done-bar">
        <div>
          <p class="done-title">{done ? 'You’ve covered the basics.' : 'Read through everything?'}</p>
          <p class="muted">Next, lock the words in with flashcards.</p>
        </div>
        {done ? (
          <NextLink course={course} step="learn" />
        ) : (
          <button type="button" class="btn btn-primary" onClick={finish}>
            <Icon name="check" size={18} /> Mark as learned
          </button>
        )}
      </div>
    </div>
  );
}
