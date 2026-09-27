import { render } from 'preact';
import './fonts.css';
import './styles.css';
import { App } from './app';
import { Maintenance } from './components/Maintenance';
import { loadCourses } from './data/courses';
import { LANG_ID, applyLanguage } from './lang';
import { loadVoice } from './lib/speech';
import './lib/cloud';
import './lib/family';

applyLanguage();
void loadCourses(LANG_ID).then(() => render(<App />, document.getElementById('app')!));

// "Down for updates" screen, in its own layer above the app.
const maint = document.body.appendChild(document.createElement('div'));
render(<Maintenance />, maint);

// Fetch the voice's clip list once the page is idle, so the first tap on a speaker plays instantly.
const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 800));
idle(() => void loadVoice());

// Installed / hosted app: work offline (not in dev, and not in the double-click play file).
if (import.meta.env.PROD && import.meta.env.MODE !== 'play' && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => void navigator.serviceWorker.register('./sw.js'));
}
