import { COURSES, STEPS, headOf, stepById } from '../data/courses';
import type { Course } from '../data/types';
import { Icon, type IconName } from '../components/Icon';
import { AudioButton, Ring, Say, courseStyle } from '../components/ui';
import { prefetchReference } from '../components/Layout';
import { cx, useTitle } from '../lib/hooks';
import { courseStats, overallStats, suggestNext, type CourseStats } from '../lib/mastery';
import { toRoman } from '../lib/numerals';
import { currentStreak, dayKey, useProgress } from '../lib/progress';
import { href } from '../router';
import { L, LANG, greeting } from '../lang';
import { useCloud } from '../lib/cloud';

function Stat({ icon, value, label }: { icon: IconName; value: string | number; label: string }) {
  return (
    <div class="stat">
      <span class="stat-icon">
        <Icon name={icon} size={20} />
      </span>
      <span>
        <span class="stat-value">{value}</span>
        <span class="stat-label">{label}</span>
      </span>
    </div>
  );
}

export function CourseCard({ course, stats, i }: { course: Course; stats: CourseStats; i: number }) {
  return (
    <a class="course-card" href={href('course', course.id)} style={{ ...courseStyle(course), '--i': i }}>
      <div class="cc-art">
        <span class="cc-num" aria-hidden="true">
          {toRoman(course.n)}
        </span>
        <span class="cc-la" lang={L}>
          {course.la}
        </span>
        {stats.complete && (
          <span class="cc-badge">
            <Icon name="check" size={14} /> Passed
          </span>
        )}
      </div>
      <div class="cc-body">
        <div class="cc-top">
          <div>
            <p class="cc-kicker">Course {course.n}</p>
            <h3>{course.title}</h3>
          </div>
          <Ring value={stats.mastery} size={48} stroke={5} colors={course.colors} label={`Mastery ${stats.mastery}%`}>
            {stats.mastery}
          </Ring>
        </div>
        <p class="cc-tag">{course.tagline}</p>
        <div class="cc-steps" aria-label={`${stats.stepsDone} of ${STEPS.length} steps complete`}>
          {STEPS.map((s) => (
            <span key={s.id} class={cx('seg', stats.stepDone[s.id] && 'on')} />
          ))}
        </div>
        <div class="cc-meta">
          <span class="level-name" lang={L}>
            {stats.level.la}
          </span>
          <span>
            {stats.wordsMastered}/{stats.wordCount} words
          </span>
        </div>
      </div>
    </a>
  );
}

function WordOfTheDay() {
  const all = COURSES.flatMap((c) => c.vocab.map((v) => ({ v, c })));
  const seed = [...dayKey()].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const { v, c } = all[seed % all.length];
  const head = headOf(v);
  return (
    <div class="hero-art" style={courseStyle(c)}>
      <div class="floaters" aria-hidden="true">
        <span class="floater f1" lang={L}>
          {LANG.floaters[0]}
        </span>
        <span class="floater f2">{LANG.floaters[1]}</span>
        <span class="floater f3" lang={L}>
          {LANG.floaters[2]}
        </span>
        <span class="floater f4" lang={L}>
          {LANG.floaters[3]}
        </span>
      </div>
      <div class="wotd">
        <p class="wotd-label">
          <span lang={L}>{LANG.wordOfDay}</span> · word of the day
        </p>
        <div class="wotd-word">
          <span lang={L}>{head}</span>
          <AudioButton text={head} size="lg" />
        </div>
        <Say text={head} />
        <p class="wotd-en">{v.en}</p>
        {v.ex && (
          <p class="wotd-ex">
            <span lang={L}>{v.ex[0]}</span>
            <span>{v.ex[1]}</span>
          </p>
        )}
        <a class="wotd-link" href={href('course', c.id)}>
          From <b>{c.title}</b> <Icon name="arrow-right" size={14} />
        </a>
      </div>
    </div>
  );
}

/** Today's personalised 10-minute lesson. */
function DailyCard() {
  const p = useProgress();
  const minutes = Math.min(10, p.daily?.days[dayKey()] ?? 0);
  const done = minutes >= 10;
  const level = p.daily?.level;
  return (
    <a class={cx('daily-card', done && 'done')} href={href('daily')}>
      <span class="daily-ring" style={{ '--pct': `${minutes * 10}%` }} aria-hidden="true">
        <span>{done ? '✓' : `${minutes}′`}</span>
      </span>
      <span class="daily-text">
        <span class="eyebrow">Daily lesson · 10 min</span>
        <b>{done ? 'Done for today! Your streak is safe 🔥' : minutes > 0 ? `${10 - minutes} minutes to go today` : 'Your 10-minute lesson is ready'}</b>
        <span class="muted small">
          Made for you{level ? ` at level ${level.toFixed(1)}` : ''}: weak words first, new ones as you’re ready. It adapts as you learn.
        </span>
      </span>
      <span class="btn btn-primary">{done ? 'More' : minutes > 0 ? 'Carry on' : 'Start'}</span>
    </a>
  );
}

export function Home() {
  const p = useProgress();
  const { name } = useCloud();
  const [hi, hiEn] = greeting();
  useTitle('');
  const overall = overallStats(p);
  const next = suggestNext(p);
  const started = p.xp > 0;
  const streak = currentStreak(p);

  return (
    <div class="container home">
      <section class="hero">
        <div class="hero-text">
          {name ? (
            <p class="hello-name">
              <span>
                <span lang={L}>{hi}</span>, {name}!
              </span>
              <span aria-hidden="true">👋</span>
              <span class="hello-en">{hiEn}</span>
            </p>
          ) : (
            <p class="eyebrow">
              <span lang={L}>{LANG.hello.replace(/[!¡ ]/g, '')}</span>. Welcome to {LANG.app}
            </p>
          )}
          <h1 class="display">
            Speak the language of <span class="grad">{LANG.place}</span>.
          </h1>
          <p class="lede">
            {LANG.lede}
          </p>
          <div class="hero-cta">
            <a class="btn btn-primary btn-lg" href={href('course', next.course.id, next.step)}>
              {started ? 'Continue' : 'Start learning'} <Icon name="arrow-right" size={18} />
            </a>
            <a class="btn btn-ghost btn-lg" href={href('reference')} onPointerEnter={prefetchReference}>
              <Icon name="column" size={18} /> Open the Lexicon
            </a>
          </div>
          {started && (
            <p class="hero-next">
              Up next: <b>{next.course.title}</b> · {stepById(next.step)?.title}
            </p>
          )}
        </div>
        <WordOfTheDay />
      </section>

      <DailyCard />

      <section class="stats" aria-label="Your progress">
        <Stat icon="flame" value={streak} label={streak === 1 ? 'day streak' : 'days streak'} />
        <Stat icon="sparkle" value={p.xp} label="XP earned" />
        <Stat icon="check" value={`${overall.wordsMastered}/${overall.wordCount}`} label="words mastered" />
        <Stat icon="trophy" value={`${overall.coursesComplete}/${COURSES.length}`} label="courses passed" />
      </section>

      <section aria-labelledby="courses-h">
        <div class="section-head">
          <h2 id="courses-h">Courses</h2>
          <p>Take them in order or jump in anywhere. Each course stands on its own.</p>
        </div>
        <div class="course-grid">
          {COURSES.map((c, i) => (
            <CourseCard key={c.id} course={c} stats={courseStats(c, p)} i={i} />
          ))}
          <a class="lexicon-card" href={href('reference')} onPointerEnter={prefetchReference} style={{ '--i': COURSES.length }}>
            <span class="lexicon-icon">
              <Icon name="column" size={26} />
            </span>
            <h3>The Lexicon</h3>
            <p>
              {LANG.id === 'la'
                ? 'Over 350 words, every declension, full verb tables, a Roman numeral converter and a pronunciation lab.'
                : `Every ${LANG.language} word from the courses, pronunciation tips, verb tables, a number converter and all the grammar in one place.`}
            </p>
            <span class="lexicon-go">
              Explore <Icon name="arrow-right" size={16} />
            </span>
          </a>
        </div>
      </section>
    </div>
  );
}
