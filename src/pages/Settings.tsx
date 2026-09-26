import { L, LANG } from '../lang';
import { useEffect, useRef, useState } from 'preact/hooks';
import { COURSES } from '../data/courses';
import { cloudEnabled, createCode, formatCode, logIn, logOut, syncNow, useCloud } from '../lib/cloud';
import { Icon } from '../components/Icon';
import { createFamily, familyStreak, formatFamilyCode, joinFamily, leaveFamily, refreshFamily, useFamily } from '../lib/family';
import { LanguagePicker } from '../components/Layout';
import { cx, useTitle } from '../lib/hooks';
import { MASTERED } from '../lib/mastery';
import { actions, dayKey, exportProgress, importProgress, useProgress } from '../lib/progress';
import {
  browserVoiceDescription,
  downloadVoiceForOffline,
  setAudioSettings,
  speak,
  useAudioSettings,
  useVoiceReady,
  voiceCanSay,
} from '../lib/speech';

const TRY = LANG.sample;

function VoiceSection() {
  const audio = useAudioSettings();
  const ready = useVoiceReady();
  const latinOk = ready && voiceCanSay(TRY[0]);

  return (
    <section class="panel settings-block" aria-labelledby="voice-h">
      <h2 id="voice-h" class="h-sm">
        <Icon name="headphones" size={18} /> Voice
      </h2>
      <div class="voice-options" role="radiogroup" aria-label="Voice">
        <label class={cx('voice-option', audio.voice === 'latin' && 'on')}>
          <input
            type="radio"
            name="voice"
            aria-label={`${LANG.app} voice (recommended)`}
            checked={audio.voice === 'latin'}
            onChange={() => setAudioSettings({ voice: 'latin' })}
          />
          <span class="voice-title">
            {LANG.app} voice <span class="tag">Recommended</span>
          </span>
          <span class="voice-desc">
            A natural neural voice recorded for every word and sentence in the app, {LANG.voiceNote}. Free, open-source
            and it runs offline.
          </span>
          {ready && !latinOk && <span class="voice-warn">Voice files not found, so the browser voice is used for now.</span>}
        </label>
        <label class={cx('voice-option', audio.voice === 'male' && 'on')}>
          <input
            type="radio"
            name="voice"
            aria-label={`${LANG.app} male voice`}
            checked={audio.voice === 'male'}
            onChange={() => setAudioSettings({ voice: 'male' })}
          />
          <span class="voice-title">{LANG.app} voice, male</span>
          <span class="voice-desc">The same classical pronunciation with a deeper male voice (slightly lower sound quality).</span>
        </label>
        <label class={cx('voice-option', audio.voice === 'browser' && 'on')}>
          <input
            type="radio"
            name="voice"
            aria-label="Browser voice"
            checked={audio.voice === 'browser'}
            onChange={() => setAudioSettings({ voice: 'browser' })}
          />
          <span class="voice-title">Browser voice</span>
          <span class="voice-desc">{browserVoiceDescription()}</span>
        </label>
      </div>

      <label class="switch-row">
        <input type="checkbox" checked={audio.slow} onChange={(e) => setAudioSettings({ slow: e.currentTarget.checked })} />
        <span class="switch" aria-hidden="true" />
        <span>
          <b>Slow speech</b>
          <span class="muted small"> · plays everything at ¾ speed. Or tap any speaker twice to hear it slowly once.</span>
        </span>
      </label>

      <div class="try-row">
        <span class="muted small">Try it:</span>
        {TRY.map((t) => (
          <button type="button" key={t} class="try-chip" lang={L} onClick={() => speak(t)}>
            <Icon name="volume" size={14} /> {t}
          </button>
        ))}
      </div>
    </section>
  );
}

function CloudSection() {
  const { code, status } = useCloud();
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch {
      setMsg({ ok: false, text: 'Couldn’t reach the cloud. Check your internet and try again.' });
    }
    setBusy(false);
  };

  return (
    <section class="panel settings-block" aria-labelledby="cloud-h">
      <h2 id="cloud-h" class="h-sm">
        <Icon name="upload" size={18} /> Log in with a code
      </h2>
      {!cloudEnabled ? (
        <p class="muted">Cloud login isn’t switched on in this copy of LatinLearn yet. Save files (below) still work.</p>
      ) : code ? (
        <>
          <p class="muted">Your login code. Type it on your phone (or any device) to get the same progress there:</p>
          <p class="cloud-code">{formatCode(code)}</p>
          <p class="muted small">
            {status.state === 'syncing'
              ? 'Syncing…'
              : status.state === 'offline'
                ? 'Offline: it will sync when you’re back online.'
                : status.at
                  ? `Synced at ${new Date(status.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
                  : 'Syncs automatically.'}{' '}
            Keep the code private: anyone with it can see and change this progress.
          </p>
          <div class="btn-row">
            <button type="button" class="btn btn-ghost btn-sm" disabled={busy} onClick={() => void run(syncNow)}>
              <Icon name="refresh" size={14} /> Sync now
            </button>
            <button type="button" class="btn btn-ghost btn-sm" onClick={logOut}>
              Log out on this device
            </button>
          </div>
        </>
      ) : (
        <>
          <p class="muted">Get a 10-digit code to keep your progress in sync between your PC and phone. No email or password needed.</p>
          <div class="btn-row">
            <button
              type="button"
              class="btn btn-primary"
              disabled={busy}
              onClick={() => void run(async () => void (await createCode()))}
            >
              <Icon name="sparkle" size={18} /> Create my code
            </button>
          </div>
          <form
            class="cloud-login"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const r = await logIn(input);
                if (r === 'ok') setMsg({ ok: true, text: 'Logged in! Your progress is here now.' });
                else if (r === 'wrong') setMsg({ ok: false, text: 'That code doesn’t match a save. Check the 10 digits.' });
                else setMsg({ ok: false, text: 'Couldn’t reach the cloud. Check your internet and try again.' });
              });
            }}
          >
            <input
              value={input}
              onInput={(e) => setInput(e.currentTarget.value)}
              inputMode="numeric"
              placeholder="Already have a code? 123 456 7890"
              aria-label="Your 10-digit login code"
              autoComplete="off"
            />
            <button type="submit" class="btn btn-ghost" disabled={busy || input.replace(/\D/g, '').length !== 10}>
              Log in
            </button>
          </form>
        </>
      )}
      <div aria-live="polite">{msg && <p class={cx('save-msg', msg.ok ? 'good' : 'bad')}>{msg.text}</p>}</div>
    </section>
  );
}

function SaveSection() {
  const p = useProgress();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const words = Object.values(p.words);
  const stars = Object.values(p.challenges).reduce((n, c) => n + c.stars, 0);
  const started = COURSES.filter((c) => Object.keys(p.courses[c.id]?.steps ?? {}).length > 0).length;

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportProgress()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `LatinLearn save ${dayKey()}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setMsg({ ok: true, text: 'Save file downloaded. Keep it somewhere safe, like your Documents folder.' });
  };

  const upload = async (f: File | undefined) => {
    if (!f) return;
    const err = importProgress(await f.text());
    setMsg(err ? { ok: false, text: err } : { ok: true, text: 'Save file loaded. Welcome back!' });
    if (file.current) file.current.value = '';
  };

  const reset = () => {
    actions.reset();
    setConfirming(false);
    setMsg({ ok: true, text: 'All progress deleted. Fresh start!' });
  };

  return (
    <section class="panel settings-block" aria-labelledby="save-h">
      <h2 id="save-h" class="h-sm">
        <Icon name="download" size={18} /> Your progress
      </h2>
      <dl class="save-stats">
        <div>
          <dt>XP</dt>
          <dd>{p.xp}</dd>
        </div>
        <div>
          <dt>Words practised</dt>
          <dd>{words.filter((s) => s > 0).length}</dd>
        </div>
        <div>
          <dt>Words mastered</dt>
          <dd>{words.filter((s) => s >= MASTERED).length}</dd>
        </div>
        <div>
          <dt>Courses started</dt>
          <dd>
            {started}/{COURSES.length}
          </dd>
        </div>
        <div>
          <dt>Challenge stars</dt>
          <dd>{stars}</dd>
        </div>
      </dl>
      <p class="muted">
        Everything saves automatically in this browser after every answer. A <b>save file</b> is a backup you keep: use it to move your
        progress to another browser or computer, or to get it back if the browser’s data is cleared.
      </p>
      <div class="btn-row">
        <button type="button" class="btn btn-primary" onClick={download}>
          <Icon name="download" size={18} /> Download save file
        </button>
        <button type="button" class="btn btn-ghost" onClick={() => file.current?.click()}>
          <Icon name="upload" size={18} /> Load save file
        </button>
        <input
          ref={file}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => void upload(e.currentTarget.files?.[0])}
        />
      </div>
      <div aria-live="polite">{msg && <p class={cx('save-msg', msg.ok ? 'good' : 'bad')}>{msg.text}</p>}</div>

      <div class="danger-zone">
        {confirming ? (
          <>
            <p>
              <b>Delete all progress?</b> XP, streak, stars, tasks and word strength will be cleared. This can’t be undone unless you
              have a save file.
            </p>
            <div class="btn-row">
              <button type="button" class="btn btn-danger" onClick={reset}>
                <Icon name="trash" size={18} /> Yes, delete everything
              </button>
              <button type="button" class="btn btn-ghost" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <button type="button" class="btn btn-ghost btn-sm" onClick={() => setConfirming(true)}>
            <Icon name="refresh" size={14} /> Reset all progress
          </button>
        )}
      </div>
    </section>
  );
}

function OfflineSection() {
  const [state, setState] = useState<string | null>(null);
  const installed = typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller;

  const save = async () => {
    setState('Saving the app…');
    await Promise.all([import('./Reference'), import('./Challenges'), import('./Auxilium')]).catch(() => undefined);
    await downloadVoiceForOffline((d, t) => setState(`Saving voice clips: ${d} of ${t}…`));
    setState('Done! Everything, including the voice, now works with no internet.');
  };

  return (
    <section class="panel settings-block" aria-labelledby="offline-h">
      <h2 id="offline-h" class="h-sm">
        <Icon name="download" size={18} /> Phone app and offline
      </h2>
      <p class="muted">
        <b>Put it on your phone:</b> open this site on your phone, then tap <b>Share → Add to Home Screen</b> (iPhone, Safari) or{' '}
        <b>⋮ → Install app</b> (Android, Chrome). It opens full-screen like a normal app.
      </p>
      {installed ? (
        <>
          <p class="muted">Pages you visit already work offline. Save the rest (about 5 MB) before you go somewhere with bad signal:</p>
          <div class="btn-row">
            <button type="button" class="btn btn-primary" onClick={() => void save()} disabled={!!state && !state.startsWith('Done')}>
              <Icon name="download" size={18} /> Download for offline
            </button>
          </div>
          {state && <p class="save-msg good">{state}</p>}
        </>
      ) : (
        <p class="muted small">Offline mode switches on when you open LatinLearn from its web address (not the double-click file).</p>
      )}
      <p class="muted small">Progress is saved separately on each device. To carry it over, download a save file here and load it on the other device.</p>
    </section>
  );
}

export function Settings() {
  useTitle('Settings');
  return (
    <div class="container settings-page">
      <header class="page-head">
        <p class="eyebrow">Settings</p>
        <h1>Voice and saving</h1>
      </header>
      <div class="settings-grid">
        <CloudSection />
        <FamilySection />
        <VoiceSection />
        <SaveSection />
        <OfflineSection />
      </div>
      <SwitchLanguage />
    </div>
  );
}

const NAME_KEY = 'latinlearn:family-name';

function FamilySection() {
  const { mine, data } = useFamily();
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [input, setInput] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mine) void refreshFamily().catch(() => setMsg({ ok: false, text: 'Couldn’t reach your family. Check your internet.' }));
  }, [mine?.code]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch {
      setMsg({ ok: false, text: 'Couldn’t reach the cloud. Check your internet and try again.' });
    }
    setBusy(false);
  };
  const cleanName = name.trim().slice(0, 20);
  const needName = () => {
    if (cleanName) {
      try {
        localStorage.setItem(NAME_KEY, cleanName);
      } catch {
        /* ignore */
      }
      return false;
    }
    setMsg({ ok: false, text: 'Type your name first so your family knows who you are.' });
    return true;
  };

  const members = data ? Object.entries(data.members).sort((a, b) => b[1].xp - a[1].xp) : [];
  const doneToday = data ? Object.keys(data.days[dayKey()] ?? {}) : [];
  const totalXp = members.reduce((n, [, m]) => n + m.xp, 0);
  const totalWords = members.reduce((n, [, m]) => n + m.words, 0);
  const goal = Math.max(1000, Math.ceil((totalXp + 1) / 1000) * 1000);
  const streak = data ? familyStreak(data) : 0;

  return (
    <section class="panel settings-block family" aria-labelledby="family-h">
      <h2 id="family-h" class="h-sm">
        <Icon name="flame" size={18} /> Family
      </h2>
      {!mine ? (
        <>
          <p class="muted">
            Learn together! Make a family, then share its 7-digit code. You’ll share a family streak and goals. Only names and scores are
            shared, never login codes.
          </p>
          <input
            class="family-name"
            value={name}
            maxLength={20}
            onInput={(e) => setName(e.currentTarget.value)}
            placeholder="Your name"
            aria-label="Your name"
          />
          <div class="btn-row">
            <button type="button" class="btn btn-primary" disabled={busy} onClick={() => !needName() && void run(() => createFamily(cleanName))}>
              <Icon name="sparkle" size={18} /> Create a family
            </button>
          </div>
          <form
            class="cloud-login"
            onSubmit={(e) => {
              e.preventDefault();
              if (needName()) return;
              void run(async () => {
                const r = await joinFamily(input, cleanName);
                setMsg(r === 'ok' ? { ok: true, text: 'You’re in! Welcome to the family.' } : { ok: false, text: 'No family has that code. Check the 7 digits.' });
              });
            }}
          >
            <input
              value={input}
              onInput={(e) => setInput(e.currentTarget.value)}
              inputMode="numeric"
              maxLength={9}
              placeholder="Family code: 123 4567"
              aria-label="Family code"
            />
            <button type="submit" class="btn btn-ghost" disabled={busy || input.replace(/\D/g, '').length !== 7}>
              Join
            </button>
          </form>
        </>
      ) : (
        <>
          {!data ? (
            <p class="muted">Loading your family…</p>
          ) : (
            <>
              <div class="family-stats">
                <div>
                  <b>🔥 {streak}</b>
                  <span>family streak</span>
                </div>
                <div>
                  <b>
                    {doneToday.length}/{members.length}
                  </b>
                  <span>practised today</span>
                </div>
                <div>
                  <b>{totalWords}</b>
                  <span>words learned</span>
                </div>
              </div>
              <div class="family-goal">
                <div class="family-goal-top">
                  <span>Family goal: {goal.toLocaleString()} XP</span>
                  <span>{totalXp.toLocaleString()} XP</span>
                </div>
                <div class="family-bar">
                  <span style={{ width: `${Math.min(100, (totalXp / goal) * 100)}%` }} />
                </div>
                {members.length > 1 && doneToday.length === members.length && <p class="muted small">Everyone practised today. Amazing teamwork! 🎉</p>}
              </div>
              <ul class="family-list">
                {members.map(([id, m], i) => (
                  <li key={id} class={cx(id === mine.id && 'me')}>
                    <span class="family-rank">{i + 1}</span>
                    <span class="family-who">
                      {m.name}
                      {id === mine.id && ' (you)'} <span aria-hidden="true">{m.langs}</span>
                    </span>
                    <span class="family-num" title="Streak">
                      🔥 {m.streak}
                    </span>
                    <span class="family-num">{m.xp.toLocaleString()} XP</span>
                    <span title={doneToday.includes(id) ? 'Practised today' : 'Not yet today'}>{doneToday.includes(id) ? '✅' : '⏳'}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div class="btn-row">
            <button type="button" class="btn btn-ghost btn-sm" onClick={() => setShowCode(!showCode)}>
              {showCode ? `Invite code: ${formatFamilyCode(mine.code)}` : 'Show invite code'}
            </button>
            <button type="button" class="btn btn-ghost btn-sm" disabled={busy} onClick={() => void run(refreshFamily)}>
              <Icon name="refresh" size={14} /> Refresh
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              onClick={() => {
                if (confirm('Leave this family? Your own progress stays.')) void leaveFamily();
              }}
            >
              Leave family
            </button>
          </div>
        </>
      )}
      <div aria-live="polite">{msg && <p class={cx('save-msg', msg.ok ? 'good' : 'bad')}>{msg.text}</p>}</div>
    </section>
  );
}

function SwitchLanguage() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" class="bored-btn" onClick={() => setOpen(true)}>
        <span class="bored-flag" aria-hidden="true">{LANG.flag}</span>
        Bored of {LANG.language}? Pick another!
      </button>
      {open && <LanguagePicker onClose={() => setOpen(false)} />}
    </>
  );
}
