/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build --mode play` inlines everything (JS, CSS, fonts) into one HTML
// file that opens with a double-click; scripts/make-play-file.mjs finishes it.
export default defineConfig(({ mode }) => {
  const play = mode === 'play';
  return {
    plugins: [preact(), play && viteSingleFile()],
    // Relative base + hash routing lets the build be served from any sub-path or opened statically.
    base: './',
    publicDir: play ? false : 'public',
    build: {
      target: 'es2020',
      outDir: play ? 'dist-play' : 'dist',
      modulePreload: { polyfill: false },
      reportCompressedSize: !play,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
