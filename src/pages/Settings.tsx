import { L, LANG, greeting } from '../lang';
import { useEffect, useRef, useState } from 'preact/hooks';
import { COURSES, courseById } from '../data/courses';
import type { CourseId } from '../data/types';
import { accountName, cloudEnabled, createCode, formatCode, logIn, logOut, setAccountName, syncNow, useCloud } from '../lib/cloud';
import { Icon } from '../components/Icon';
import {
  compPhase,
  compRanking,
  createFamily,
  familyStreak,
  formatFamilyCode,
  joinFamily,
  leaveFamily,
  refreshFamily,
  startComp,
  timeLeft,
  useFamily,
  type FamilyData,
} from '../lib/family';
import { addFriend, formatFriendId, refreshBoard, refreshFriends, removeFriend, useFriends } from '../lib/friends';
import { disablePush, enablePush, pushSupport, setPushPrefs, usePush, type PushPrefs } from '../lib/push';
import { href } from '../router';
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

/** What the second voice option is in each language (not every language has a clear free male voice). */
const SECOND_VOICE: Record<typeof LANG.id, [string, string]> = {
  la: ['male', 'The same classical pronunciation with a deeper male voice (slightly lower sound quality).'],
  de: ['alternative', 'Thorsten again, in a higher-quality model. No free female German voice says short words clearly, so both are Thorsten.'],
  es: ['male', 'A male voice from the same Spanish recordings.'],
  fr: ['alternative', 'The same speaker, Siwis: the free male French voices mumble short words.'],
  zh: ['alternative', 'The same speaker: the free male Chinese voice isn’t clear enough yet.'],
  ar: ['alternative', 'Kareem again, in a lighter model. There’s no free female Arabic voice yet.'],
  ja: ['male', 'A male voice from the same Japanese recordings.'],
  ru: ['male', 'Ruslan, a male Russian voice.'],
  vi: ['alternative', 'The same speaker: the free male Vietnamese voices get the tones wrong.'],
};

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
            aria-label={`${LANG.app} ${SECOND_VOICE[LANG.id][0]} voice`}
            checked={audio.voice === 'male'}
            onChange={() => setAudioSettings({ voice: 'male' })}
          />
          <span class="voice-title">
            {LANG.app} voice, {SECOND_VOICE[LANG.id][0]}
          </span>
          <span class="voice-desc">{SECOND_VOICE[LANG.id][1]}</span>
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

/** A name on the account, so the app can greet you: “Guten Tag, Dave!”. */
function NameForm() {
  const { name } = useCloud();
  const [value, setValue] = useState(name);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  useEffect(() => setValue(name), [name]); // arrives from the cloud after logging in
  const [hi] = greeting();
  const shown = value.trim() || name;
  return (
    <form
      class="name-form"
      onSubmit={(e) => {
        e.preventDefault();
        setState('saving');
        setAccountName(value).then(
          () => setState('saved'),
          () => setState('error'),
        );
      }}
    >
      <label class="name-label" for="account-name">
        Your name
      </label>
      <div class="cloud-login">
        <input
          id="account-name"
          value={value}
          maxLength={20}
          placeholder="e.g. Dave"
          autoComplete="given-name"
          onInput={(e) => {
            setValue(e.currentTarget.value);
            setState('idle');
          }}
        />
        <button type="submit" class="btn btn-ghost" disabled={state === 'saving' || value.trim() === name}>
          {state === 'saving' ? 'Saving…' : 'Save'}
        </button>
      </div>
      <p class="muted small" aria-live="polite">
        {state === 'error'
          ? 'Couldn’t save. Check your internet and try again.'
          : shown
            ? (
              <>
                {state === 'saved' ? 'Saved! ' : ''}The app will greet you: <b lang={L}>{hi}</b>, <b>{shown}</b>!
              </>
            )
            : `Add your name and ${LANG.app} will greet you in ${LANG.language}.`}
      </p>
    </form>
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
          <NameForm />
          <div class="btn-row">
            <button type="button" class="btn btn-ghost btn-sm" disabled={busy} onClick={() => void run(syncNow)}>
              <Icon name="refresh" size={14} /> Sync now
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => {
                const warn =
                  status.state === 'offline'
                    ? 'You’re offline, so your newest progress hasn’t been saved yet. Log out anyway? This device will be cleared.'
                    : 'Log out? Your progress stays safe in your account, and this device is cleared until you log in again.';
                if (confirm(warn)) void run(logOut);
              }}
            >
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
        <h1>You and your settings</h1>
      </header>
      <div class="settings-grid">
        <CloudSection />
        <NotificationsSection />
        <FamilySection />
        <FriendsSection />
        <LeaderboardSection />
        <VoiceSection />
        <SaveSection />
        <OfflineSection />
      </div>
      <SwitchLanguage />
    </div>
  );
}

const NAME_KEY = 'latinlearn:family-name';

const LENGTHS: [string, number][] = [
  ['10 min', 10],
  ['1 hour', 60],
  ['1 day', 1440],
];

/** Start a family speed battle, or show the one that's on. */
export function BattleCard({ data, mineId }: { data: FamilyData; mineId: string }) {
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const comp = data.comp;
  const phase = compPhase(comp, data.members);
  const ranking = compRanking(comp);
  const courseTitle = comp?.course ? (courseById(comp.course as CourseId)?.title ?? comp.course) : '';

  if (phase === 'vote' && comp) {
    const voted = Object.keys(comp.votes ?? {}).length;
    return (
      <div class="battle-card on">
        <p class="battle-title">🗳️ {comp.by} started a speed battle!</p>
        <p class="muted small">
          Vote for the course. {voted} of {Object.keys(data.members).length} voted{comp.votes?.[mineId] ? ' (including you)' : ''}.
        </p>
        <a class="btn btn-primary" href={href('compete')}>
          {comp.votes?.[mineId] ? 'See the votes' : 'Vote now'}
        </a>
      </div>
    );
  }
  if (phase === 'play' && comp) {
    const played = comp.scores?.[mineId];
    return (
      <div class="battle-card on">
        <p class="battle-title">
          ⚡ Speed battle: {courseTitle}! Ends in {timeLeft((comp.end ?? 0) - Date.now())}
        </p>
        <p class="muted small">{ranking.length ? `Leader: ${ranking[0][1].name} with ${ranking[0][1].best}.` : 'Nobody has played yet.'}</p>
        <a class="btn btn-primary" href={href('compete')}>
          {played ? 'See the scores' : 'Play your round'}
        </a>
      </div>
    );
  }
  return (
    <div class="battle-card">
      <p class="battle-title">⚡ Family speed battle</p>
      {phase === 'done' && ranking.length > 0 && (
        <p class="muted small">
          Last battle ({courseTitle}): <b>{ranking[0][1].name}</b> won with {ranking[0][1].best} points 🏆
        </p>
      )}
      <p class="muted small">
        The family votes for a course, then everyone gets one 60-second speed round in their own language. Highest score wins. Pick how
        long everyone has to play:
      </p>
      <div class="btn-row">
        {LENGTHS.map(([label, mins]) => (
          <button
            key={label}
            type="button"
            class="btn btn-ghost btn-sm"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void startComp(mins)
                .then(() => (location.hash = href('compete')))
                .catch(() => alert('Couldn’t reach the cloud. Check your internet.'))
                .finally(() => setBusy(false));
            }}
          >
            Start: {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FamilySection() {
  const { account, mine, data } = useFamily();
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? accountName();
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
      {!account ? (
        <p class="muted">
          Families are saved to your account, so first <b>create a login code</b> (or log in) in the box above. Then you can make or join a family.
        </p>
      ) : !mine ? (
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
              <BattleCard data={data} mineId={mine.id} />
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

const PUSH_KINDS: [keyof Omit<PushPrefs, 'hour'>, string, string][] = [
  ['streak', 'Streak saver', 'An hour before your streak runs out.'],
  ['daily', 'Daily reminder', 'If you haven’t practised yet that day.'],
  ['away', 'We miss you', 'If you haven’t been on for a few days.'],
];
const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** Turn on notifications (streak saver, daily reminder, "we miss you"). */
function NotificationsSection() {
  const { on, prefs } = usePush();
  const support = pushSupport();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch {
      setMsg({ ok: false, text: 'Couldn’t turn notifications on. Check your internet and try again.' });
    }
    setBusy(false);
  };
  const change = (next: PushPrefs) => void run(() => setPushPrefs(next));

  return (
    <section class="panel settings-block family" aria-labelledby="push-h">
      <h2 id="push-h" class="h-sm">
        <Icon name="clock" size={18} /> Notifications
      </h2>
      {support === 'ios-install' ? (
        <p class="muted">
          On iPhone, notifications only work in the Home Screen app. Add {LANG.app} to your Home Screen (Share, then <b>Add to Home Screen</b>), open it
          from there, then turn them on here.
        </p>
      ) : support === 'no' ? (
        <p class="muted">This browser can’t show notifications. Open {LANG.app} online (or from your Home Screen) to turn them on.</p>
      ) : !on ? (
        <>
          <p class="muted">Get a nudge so you never lose your streak:</p>
          <ul class="push-kinds">
            {PUSH_KINDS.map(([k, title, text]) => (
              <li key={k}>
                <b>{title}:</b> {text}
              </li>
            ))}
          </ul>
          {Notification.permission === 'denied' && (
            <p class="muted small">Notifications are blocked for {LANG.app}. Allow them in your phone or browser settings, then try again.</p>
          )}
          <div class="btn-row">
            <button
              type="button"
              class="btn btn-primary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const r = await enablePush();
                  setMsg(
                    r === 'ok'
                      ? { ok: true, text: 'Notifications are on! 🔔' }
                      : { ok: false, text: `Notifications weren’t allowed. Allow them for ${LANG.app} in your settings, then try again.` },
                  );
                })
              }
            >
              <Icon name="sparkle" size={18} /> Turn on notifications
            </button>
          </div>
        </>
      ) : (
        <>
          <div class="push-options">
            {PUSH_KINDS.map(([k, title, text]) => (
              <label key={k} class="push-option">
                <input type="checkbox" checked={prefs[k]} disabled={busy} onChange={(e) => change({ ...prefs, [k]: e.currentTarget.checked })} />
                <span>
                  <b>{title}</b>
                  <small class="muted">{text}</small>
                </span>
              </label>
            ))}
          </div>
          {prefs.daily && (
            <label class="push-time">
              Remind me at
              <select value={prefs.hour} disabled={busy} onChange={(e) => change({ ...prefs, hour: Number(e.currentTarget.value) })}>
                {Array.from({ length: 15 }, (_, i) => i + 7).map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div class="btn-row">
            <button type="button" class="btn btn-ghost btn-sm" disabled={busy} onClick={() => void run(disablePush)}>
              Turn off notifications
            </button>
          </div>
        </>
      )}
      <div aria-live="polite">{msg && <p class={cx('save-msg', msg.ok ? 'good' : 'bad')}>{msg.text}</p>}</div>
    </section>
  );
}

/** Add friends by their 8-digit friend ID and see how they're doing. */
function FriendsSection() {
  const { account, myId, friends } = useFriends();
  const { name } = useCloud();
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (myId) void refreshFriends().catch(() => setMsg({ ok: false, text: 'Couldn’t reach your friends. Check your internet.' }));
  }, [myId]);

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
    <section class="panel settings-block family" aria-labelledby="friends-h">
      <h2 id="friends-h" class="h-sm">
        <Icon name="star" size={18} /> Friends
      </h2>
      {!account ? (
        <p class="muted">
          Friends are saved to your account, so first <b>create a login code</b> (or log in) in the box above. Then you get a friend ID to share.
        </p>
      ) : !myId ? (
        <p class="muted">Getting your friend ID…</p>
      ) : (
        <>
          <div class="friend-id">
            <span>Your friend ID</span>
            <b>{formatFriendId(myId)}</b>
            <small class="muted">Share it so friends can add you. It’s not your login code.</small>
          </div>
          {!name && <p class="muted small">Add your name in the account box above so friends know it’s you.</p>}
          <form
            class="cloud-login"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const r = await addFriend(input);
                setMsg(ADDED[r]);
                if (r === 'ok') setInput('');
              });
            }}
          >
            <input
              value={input}
              onInput={(e) => setInput(e.currentTarget.value)}
              inputMode="numeric"
              maxLength={10}
              placeholder="Friend ID: 1234 5678"
              aria-label="Friend ID"
            />
            <button type="submit" class="btn btn-ghost" disabled={busy || input.replace(/\D/g, '').length !== 8}>
              Add
            </button>
          </form>
          {!friends ? (
            <p class="muted">Loading your friends…</p>
          ) : friends.length === 0 ? (
            <p class="muted">No friends yet. Add one with their friend ID!</p>
          ) : (
            <ul class="family-list">
              {friends.map(([id, f], i) => (
                <li key={id}>
                  <span class="family-rank">{i + 1}</span>
                  <span class="family-who">
                    {f.name} <span aria-hidden="true">{f.langs}</span>
                  </span>
                  <span class="family-num" title="Streak">
                    🔥 {f.streak}
                  </span>
                  <span class="family-num">{f.xp.toLocaleString()} XP</span>
                  <button
                    type="button"
                    class="friend-remove"
                    aria-label={`Remove ${f.name}`}
                    title="Remove friend"
                    onClick={() => {
                      if (confirm(`Remove ${f.name} from your friends?`)) void run(() => removeFriend(id));
                    }}
                  >
                    <Icon name="x" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div class="btn-row">
            <button type="button" class="btn btn-ghost btn-sm" disabled={busy} onClick={() => void run(refreshFriends)}>
              <Icon name="refresh" size={14} /> Refresh
            </button>
          </div>
        </>
      )}
      <div aria-live="polite">{msg && <p class={cx('save-msg', msg.ok ? 'good' : 'bad')}>{msg.text}</p>}</div>
    </section>
  );
}

const ADDED = {
  ok: { ok: true, text: 'Friend added! You can both see each other now.' },
  wrong: { ok: false, text: 'Nobody has that friend ID. Check the 8 digits.' },
  self: { ok: false, text: 'That’s your own friend ID!' },
  already: { ok: false, text: 'You’re already friends.' },
};

const MEDALS = ['🥇', '🥈', '🥉'];

/** The 10 learners with the most XP across the whole app. */
function LeaderboardSection() {
  const { myId, board } = useFriends();
  const [error, setError] = useState(false);
  useEffect(() => {
    void refreshBoard().catch(() => setError(true));
  }, []);
  return (
    <section class="panel settings-block family" aria-labelledby="board-h">
      <h2 id="board-h" class="h-sm">
        <Icon name="trophy" size={18} /> Top 10 learners
      </h2>
      <p class="muted small">Everyone on LanguageLearn with an account, ranked by XP across all their languages.</p>
      {error && !board ? (
        <p class="muted">Couldn’t load the leaderboard. Check your internet.</p>
      ) : !board ? (
        <p class="muted">Loading the leaderboard…</p>
      ) : board.length === 0 ? (
        <p class="muted">Nobody’s on the board yet. Be the first!</p>
      ) : (
        <ol class="family-list">
          {board.map(([id, p], i) => (
            <li key={id} class={cx(id === myId && 'me')}>
              <span class="family-rank">{MEDALS[i] ?? i + 1}</span>
              <span class="family-who">
                {p.name}
                {id === myId && ' (you)'} <span aria-hidden="true">{p.langs}</span>
              </span>
              <span class="family-num" title="Streak">
                🔥 {p.streak}
              </span>
              <span class="family-num">{p.xp.toLocaleString()} XP</span>
            </li>
          ))}
        </ol>
      )}
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
