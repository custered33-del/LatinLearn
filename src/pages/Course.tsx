import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { COURSES, STEPS, challengesOf, headOf, stepById } from '../data/courses';
import { TaskList } from '../components/TaskList';
import { challengesDone, courseTasks } from '../lib/tasks';
import type { Course, StepId } from '../data/types';
import { Icon, type IconName } from '../components/Icon';
import { Ring, courseStyle } from '../components/ui';
import { cx, useTitle } from '../lib/hooks';
import { LEVELS, MASTERED, PASS_MARK, courseStats } from '../lib/mastery';
import { toRoman } from '../lib/numerals';
import { MAX_STRENGTH, actions, courseOf, useProgress } from '../lib/progress';
import { speak } from '../lib/speech';
import { href } from '../router';
import { L } from '../lang';

export const STEP_ICONS: Record<StepId, IconName> = {
  learn: 'book',
  flashcards: 'cards',
  match: 'grid',
  speak: 'mic',
  challenges: 'flag',
  quiz: 'target',
};

export function CourseOverview({ course }: { course: Course }) {
  const p = useProgress();
  const s = courseStats(course, p);
  const cp = courseOf(p, course.id);
  useTitle(course.title);

  const meta: Partial<Record<StepId, string>> = {
    learn: `${course.vocab.length} words · ${course.ideas.length} key ideas`,
    match: cp.bestMatch !== undefined ? `Best ${cp.bestMatch}s` : undefined,
    speak: cp.bestSpeak !== undefined ? `Best ${cp.bestSpeak}%` : undefined,
    challenges: `${challengesDone(course, p)}/${challengesOf(course).length} done`,
    quiz: cp.quizzes ? `Best ${cp.bestQuiz}%` : `Pass mark ${PASS_MARK}%`,
  };
  const tasks = courseTasks(course, p);
  const tasksDone = tasks.filter((t) => t.done).length;
  const cta = s.nextStep ?? 'quiz';

  return (
    <div class="container course-page" style={courseStyle(course)}>
      <section class="course-hero">
        <span class="course-hero-num" aria-hidden="true">
          {toRoman(course.n)}
        </span>
        <a class="crumb" href={href()}>
          <Icon name="arrow-left" size={16} /> All courses
        </a>
        <p class="course-hero-kicker">Course {course.n} of {COURSES.length}</p>
        <h1>{course.title}</h1>
        <p class="course-hero-la" lang={L}>
          {course.la}
        </p>
        <p class="course-hero-blurb">{course.blurb}</p>
        <a class="btn btn-light btn-lg" href={href('course', course.id, cta)}>
          {s.stepsDone === 0 ? 'Start course' : s.complete ? 'Retake the quiz' : `Continue: ${stepById(cta)?.title}`}
          <Icon name="arrow-right" size={18} />
        </a>
      </section>

      <div class="course-layout">
        <section aria-labelledby="path-h">
          <h2 id="path-h" class="h-sm">
            Your path
          </h2>
          <ol class="step-list">
            {STEPS.map((st, i) => {
              const done = s.stepDone[st.id];
              return (
                <li key={st.id}>
                  <a class={cx('step-row', done && 'done', st.id === s.nextStep && 'is-next')} href={href('course', course.id, st.id)}>
                    <span class="step-num" aria-hidden="true">
                      {done ? <Icon name="check" size={18} /> : i + 1}
                    </span>
                    <span class="step-text">
                      <span class="step-title">
                        <Icon name={STEP_ICONS[st.id]} size={16} /> {st.title}
                        {done && <span class="sr-only"> (complete)</span>}
                      </span>
                      <span class="step-desc">{st.desc}</span>
                    </span>
                    {meta[st.id] && <span class="step-meta">{meta[st.id]}</span>}
                    <Icon name="chevron-right" size={18} class="step-go" />
                  </a>
                </li>
              );
            })}
          </ol>
        </section>

        <aside class="panel mastery-panel" aria-labelledby="mastery-h">
          <h2 id="mastery-h" class="h-sm">
            Mastery
          </h2>
          <div class="mastery-top">
            <Ring value={s.mastery} size={112} stroke={10} colors={course.colors} label={`Mastery ${s.mastery}%`}>
              <span class="ring-big">{s.mastery}%</span>
            </Ring>
            <div>
              <p class="level-now" lang={L}>
                {s.level.la}
              </p>
              <p class="muted">{s.level.en}</p>
              <p class="muted small">
                {s.stepsDone}/{STEPS.length} steps · {s.wordsMastered}/{s.wordCount} words mastered
              </p>
            </div>
          </div>
          <ol class="ladder" aria-label="Mastery levels">
            {LEVELS.map((l) => (
              <li key={l.la} class={cx(s.mastery >= l.min && 'reached', s.level === l && 'current')}>
                <span lang={L}>{l.la}</span>
                <span class="muted">{l.min}%+</span>
              </li>
            ))}
          </ol>
          <p class="muted small">Mastery combines how well you know each word (60%) with your best quiz score (40%).</p>
        </aside>
      </div>

      <section class="panel course-tasks" aria-labelledby="tasks-h">
        <div class="panel-head">
          <h2 id="tasks-h" class="h-sm">
            Tasks{' '}
            <span class="count">
              {tasksDone}/{tasks.length}
            </span>
          </h2>
          <p class="muted small">Goals to help this course stick. Game goals tick themselves as you play.</p>
        </div>
        <TaskList course={course} />
      </section>

      <section class="panel" aria-labelledby="words-h">
        <div class="panel-head">
          <h2 id="words-h" class="h-sm">
            Word strength
          </h2>
          <p class="muted small">Tap a word to hear it. Bars fill as you get answers right; {MASTERED}+ bars means mastered.</p>
        </div>
        <ul class="word-grid">
          {course.vocab.map((v) => {
            const str = p.words[v.id] ?? 0;
            return (
              <li key={v.id}>
                <button
                  type="button"
                  class={cx('word-chip', str >= MASTERED && 'mastered')}
                  onClick={() => speak(headOf(v))}
                  title={v.en}
                  aria-label={`${headOf(v)}, ${v.en}, strength ${str} of ${MAX_STRENGTH}`}
                >
                  <span lang={L}>{headOf(v)}</span>
                  <span class="bars" aria-hidden="true">
                    {Array.from({ length: MAX_STRENGTH }, (_, i) => (
                      <i key={i} class={i < str ? 'on' : undefined} />
                    ))}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/** Frame around each step: breadcrumb, step tabs and the "what's next" link. */
export function StepShell({ course, step, sub, children }: { course: Course; step: StepId; sub?: string; children: ComponentChildren }) {
  const p = useProgress();
  const s = courseStats(course, p);
  const info = stepById(step)!;
  // A sub-page (e.g. one challenge) sets its own, more specific title.
  useTitle(sub ? null : `${info.title} · ${course.title}`);
  useEffect(() => actions.visit(course.id, step), [course.id, step]);

  return (
    <div class="container step-page" style={courseStyle(course)}>
      <div class="step-top">
        <a class="crumb crumb-dark" href={href('course', course.id)}>
          <Icon name="arrow-left" size={16} />
          <span>{course.title}</span>
        </a>
        <nav class="step-tabs" aria-label={`${course.title} steps`}>
          {STEPS.map((st, i) => (
            <a
              key={st.id}
              class="step-tab"
              href={href('course', course.id, st.id)}
              aria-current={st.id === step ? 'page' : undefined}
            >
              <span class="step-tab-n">{s.stepDone[st.id] ? <Icon name="check" size={13} /> : i + 1}</span>
              {st.title}
            </a>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}

/** Link to the following step, or to the next course after the quiz. */
export function NextLink({ course, step }: { course: Course; step: StepId }) {
  const i = STEPS.findIndex((s) => s.id === step);
  const next = STEPS[i + 1];
  if (next) {
    return (
      <a class="btn btn-primary" href={href('course', course.id, next.id)}>
        Next: {next.title} <Icon name="arrow-right" size={18} />
      </a>
    );
  }
  const nextCourse = COURSES.find((c) => c.n === course.n + 1);
  return nextCourse ? (
    <a class="btn btn-primary" href={href('course', nextCourse.id)}>
      Next course: {nextCourse.title} <Icon name="arrow-right" size={18} />
    </a>
  ) : (
    <a class="btn btn-primary" href={href()}>
      All courses <Icon name="arrow-right" size={18} />
    </a>
  );
}
