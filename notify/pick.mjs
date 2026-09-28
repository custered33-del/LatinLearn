// Which notification (if any) a device should get right now. Kept apart from send.mjs so it can be tested.

const DAY = 86_400_000;

/** The date and time on the device's own clock. */
export function localTime(tz, at = Date.now()) {
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  } catch {
    return localTime('UTC', at);
  }
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), minute: Number(p.minute) };
}
export function dayBefore(day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

/** What (if anything) to send this device right now. */
export function pick(d, now = Date.now()) {
  const prefs = d.prefs ?? {};
  const sent = d.sent ?? {};
  const { day, hour, minute } = localTime(d.tz);
  const minsLeft = 24 * 60 - (hour * 60 + minute);
  const away = d.seen ? Math.floor((now - d.seen) / DAY) : 0;
  const app = d.app || 'LatinLearn';
  const language = d.language || 'Latin';
  const hello = d.hello || 'Salve';
  const streak = Number(d.streak) || 0;

  // 1. Streak saver: practised yesterday, not yet today, about an hour before midnight.
  if (prefs.streak !== false && streak > 0 && d.lastDay === dayBefore(day) && minsLeft <= 75 && minsLeft >= 5 && sent.streak !== day) {
    const left = minsLeft >= 50 ? '1 hour' : `${minsLeft} minutes`;
    return { kind: 'streak', mark: day, title: `🔥 ${streak}-day streak in danger!`, body: `Your ${app} streak ends in ${left}. A quick lesson keeps it alive.`, url: '#/daily' };
  }
  // 2. "We miss you": nothing for 3+ days (then every 3 days, up to 2 months), in the late afternoon.
  if (prefs.away !== false && away >= 3 && away <= 60 && hour >= 16 && hour < 20 && (!sent.away || now - sent.away >= 3 * DAY - 3_600_000)) {
    return { kind: 'away', mark: now, title: `${hello}! We miss you 👋`, body: `It’s been ${away} days. Your ${language} words are waiting: one 10-minute lesson gets you back on track.`, url: '#/daily' };
  }
  // 3. Daily reminder at the chosen hour if you haven't practised today.
  const at = Number.isInteger(prefs.hour) ? prefs.hour : 17;
  if (prefs.daily !== false && away < 3 && d.lastDay !== day && hour >= at && hour < 22 && sent.daily !== day) {
    const body = streak > 0 && d.lastDay === dayBefore(day)
      ? `Keep your ${streak}-day streak going: today’s 10-minute ${language} lesson is ready.`
      : `Time for some ${language}! Today’s 10-minute lesson is ready.`;
    return { kind: 'daily', mark: day, title: `${hello}! ⏰`, body, url: '#/daily' };
  }
  return null;
}
