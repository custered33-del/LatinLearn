import type { ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';
import type { Course, Table } from '../data/types';
import { respell } from '../lib/latin';
import { speak, ttsSupported } from '../lib/speech';
import { cx } from '../lib/hooks';
import { Icon } from './Icon';

/** CSS custom properties that theme a subtree with a course's colours. */
export const courseStyle = (c: Course) => ({ '--c1': c.colors[0], '--c2': c.colors[1] }) as Record<string, string>;

export function Ring({
  value,
  size = 56,
  stroke = 6,
  colors,
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  colors?: [string, string];
  children?: ComponentChildren;
  label?: string;
}) {
  const id = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div class="ring" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(pct)}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color={colors?.[0] ?? 'var(--accent)'} />
            <stop offset="1" stop-color={colors?.[1] ?? 'var(--accent-2)'} />
          </linearGradient>
        </defs>
        <circle class="ring-track" cx={size / 2} cy={size / 2} r={r} stroke-width={stroke} fill="none" />
        <circle
          class="ring-bar"
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke-width={stroke}
          fill="none"
          stroke={`url(#${id})`}
          stroke-linecap="round"
          stroke-dasharray={c}
          stroke-dashoffset={c * (1 - pct / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children && <div class="ring-label">{children}</div>}
    </div>
  );
}

export function AudioButton({ text, size = 'md', class: cls }: { text: string; size?: 'sm' | 'md' | 'lg'; class?: string }) {
  if (!ttsSupported) return null;
  return (
    <button
      type="button"
      class={cx('icon-btn audio', `audio-${size}`, cls)}
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      aria-label={`Listen: ${text}`}
      title="Listen (tap again to hear it slowly)"
    >
      <Icon name="volume" size={size === 'lg' ? 22 : size === 'sm' ? 16 : 18} />
    </button>
  );
}

/**
 * Pronunciation guide, e.g. "say kai-RU-leh-us". The "say" tag matters: without
 * it learners can mistake the guide for the spelling ("OO-nus" read as "onus").
 */
export function Say({ text, class: cls }: { text: string; class?: string }) {
  const guide = respell(text);
  return (
    <span class={cx('say', cls)} title="How to say it (not the spelling)">
      <span class="say-tag" aria-hidden="true">
        say
      </span>
      <span class="sr-only">Pronounced </span>
      <span class="say-text">{guide}</span>
    </span>
  );
}

/** Inline markup: **bold** and _latin_. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : p.length > 2 && p.startsWith('_') && p.endsWith('_') ? (
          <em key={i} class="la" lang="la">
            {p.slice(1, -1)}
          </em>
        ) : (
          p
        ),
      )}
    </>
  );
}

export function DataTable({ table, caption }: { table: Table; caption?: string }) {
  const la = new Set(table.la ?? []);
  const rowHeaders = table.head[0] === '';
  return (
    <div class="table-wrap">
      <table class="data">
        {caption && <caption class="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {table.head.map((h, i) => (
              <th key={i} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, i) =>
                i === 0 && rowHeaders ? (
                  <th key={i} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={i} class={la.has(i) ? 'la' : undefined} lang={la.has(i) ? 'la' : undefined}>
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Paradigm form: "puell|ārum" renders the ending highlighted. */
export function Form({ f }: { f: string }) {
  const i = f.indexOf('|');
  if (i < 0) return <span lang="la">{f}</span>;
  return (
    <span lang="la">
      {f.slice(0, i)}
      <b class="end">{f.slice(i + 1)}</b>
    </span>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div class="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div class="loading" role="status">
      <span class="spinner" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}
