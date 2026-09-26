import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { courseById, stepById } from './data/courses';
import type { Course, StepId } from './data/types';
import { Footer, Header } from './components/Layout';
import { Icon } from './components/Icon';
import { Spinner } from './components/ui';
import { useTitle } from './lib/hooks';
import { href, useRoute } from './router';
import { CourseOverview, StepShell } from './pages/Course';
import { Flashcards } from './pages/Flashcards';
import { Home } from './pages/Home';
import { Learn } from './pages/Learn';
import { Match } from './pages/Match';
import { Quiz } from './pages/Quiz';
import { Settings } from './pages/Settings';
import { Speak } from './pages/Speak';
import { L, LANG } from './lang';

type StepProps = { course: Course; sub?: string };

/**
 * Split heavy pages into their own chunks. Once loaded, the component is cached
 * so returning to the page renders immediately without a spinner.
 */
function lazyPage<P>(load: () => Promise<(p: P) => JSX.Element>, loading: string) {
  let cached: ((p: P) => JSX.Element) | null = null;
  return function LazyPage(props: P & JSX.IntrinsicAttributes) {
    const [Comp, setComp] = useState(() => cached);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
      if (Comp) return;
      load().then(
        (c) => {
          cached = c;
          setComp(() => c);
        },
        () => setFailed(true),
      );
    }, []);
    if (failed) {
      return (
        <div class="container empty-page">
          <p>This page couldn’t load. Check your connection and refresh.</p>
        </div>
      );
    }
    return Comp ? <Comp {...props} /> : <Spinner label={loading} />;
  };
}

const LazyReference = lazyPage<{ tab?: string }>(
  () => (L === 'la' ? import('./pages/Reference').then((m) => m.Reference) : import('./pages/RefModern').then((m) => m.RefModern)),
  'Opening the Lexicon',
);
const LazyChallenges = lazyPage<StepProps>(() => import('./pages/Challenges').then((m) => m.Challenges), 'Loading challenges');
const LazyAuxilium = lazyPage<object>(
  () => Promise.all([import('./pages/Auxilium'), import('./lib/auxilium').then((m) => m.ready)]).then(([m]) => m.Auxilium),
  'Waking up Auxilium',
);

const STEP_PAGES: Record<StepId, (p: StepProps) => JSX.Element> = {
  learn: Learn,
  flashcards: Flashcards,
  match: Match,
  speak: Speak,
  challenges: LazyChallenges,
  quiz: Quiz,
};

function NotFound() {
  useTitle('Page not found');
  return (
    <div class="container empty-page">
      <p class="eyebrow">Error 404</p>
      <h1 class="display-sm">
        <span lang={L}>Ubi est?</span>
      </h1>
      <p class="muted">We couldn’t find that page. (That means “Where is it?”)</p>
      <a class="btn btn-primary" href={href()}>
        Back to courses
      </a>
    </div>
  );
}

export function App() {
  const route = useRoute();
  const [section, id, step, sub] = route;
  const key = route.join('/');
  const main = useRef<HTMLElement>(null);
  const first = useRef(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Move focus to the new page for keyboard and screen reader users (not on first load).
    if (first.current) first.current = false;
    else main.current?.focus({ preventScroll: true });
  }, [key]);

  let page: JSX.Element;
  let nav: 'courses' | 'reference' | 'settings' | '' = 'courses';
  const course = section === 'course' ? courseById(id) : undefined;

  if (!section) page = <Home />;
  else if (course && !step) page = <CourseOverview course={course} />;
  else if (course && stepById(step)) {
    const Step = STEP_PAGES[step as StepId];
    page = (
      <StepShell course={course} step={step as StepId} sub={sub}>
        <Step course={course} sub={sub} />
      </StepShell>
    );
  } else if (section === 'reference') {
    nav = 'reference';
    page = <LazyReference tab={id} />;
  } else if (section === 'auxilium' && !id) {
    nav = '';
    page = <LazyAuxilium />;
  } else if (section === 'settings' && !id) {
    nav = 'settings';
    page = <Settings />;
  } else {
    nav = '';
    page = <NotFound />;
  }

  // Changing tabs inside the Lexicon shouldn't replay the page entrance.
  const pageKey = section === 'reference' ? 'reference' : key;

  return (
    <>
      <a
        class="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <Header section={nav} />
      <main id="main" ref={main} tabIndex={-1} class="page" key={pageKey}>
        {page}
      </main>
      <Footer />
      {/* Floating helper, hidden inside drills and games where it could cover buttons. */}
      {section !== 'auxilium' && !step && (
        <a class="aux-fab" href={href('auxilium')} aria-label={`Ask Auxilium, your ${LANG.language} practice buddy`}>
          <Icon name="chat" size={22} />
          <span>Auxilium</span>
        </a>
      )}
    </>
  );
}
