import { render } from 'preact';
import './fonts.css';
import './styles.css';
import { App } from './app';
import { loadVoice } from './lib/speech';
import './lib/cloud';

render(<App />, document.getElementById('app')!);

// Fetch the voice's clip list once the page is idle, so the first tap on a speaker plays instantly.
const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 800));
idle(() => void loadVoice());

// Installed / hosted app: work offline (not in dev, and not in the double-click play file).
if (import.meta.env.PROD && import.meta.env.MODE !== 'play' && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => void navigator.serviceWorker.register('./sw.js'));
}
