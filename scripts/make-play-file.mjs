// Turn the single-file build (dist-play/index.html) into "Play LatinLearn.html"
// at the project root: a self-contained app you can double-click to play.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
let html = readFileSync(new URL('dist-play/index.html', root), 'utf8');

// Inline the favicon; drop links that only make sense on a web server.
const favicon = readFileSync(new URL('public/favicon.svg', root));
html = html
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${favicon.toString('base64')}" />`)
  .replace(/\s*<link rel="(manifest|apple-touch-icon)"[^>]*>/g, '');

if (/src="\.?\/?assets\//.test(html) || /href="\.?\/?assets\//.test(html)) {
  throw new Error('Play file still references external assets; the single-file build did not inline everything.');
}

const out = new URL('Play LatinLearn.html', root);
writeFileSync(out, html);
rmSync(new URL('dist-play/', root), { recursive: true, force: true });
console.log(`Wrote "Play LatinLearn.html" (${Math.round(html.length / 1024)} KB). Double-click it to play.`);
