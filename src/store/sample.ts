/**
 * Sample data, seeded only in development on an empty database so the demo
 * looks alive. Dates are relative to today. Deterministic: no randomness.
 */
import { addDays, isBefore, isDue, type Activity, type DateKey, type Log } from '../engine';

export function sampleActivities(today: DateKey, lang: 'es' | 'en'): Activity[] {
  const es = lang === 'es';
  return [
    {
      id: 'gym', name: es ? 'Entrenar' : 'Gym', icon: 'barbell', color: 'coral', record: 'check',
      minimal: es ? '20 min de movilidad' : '20 min mobility', start: addDays(today, -12), end: null, reminder: '06:30',
      freq: { type: 'cycle', anchor: 'relative', steps: es
        ? [{ label: 'Empuje' }, { label: 'Jalón' }, { label: 'Pierna' }, { label: 'Descanso', rest: true }]
        : [{ label: 'Push' }, { label: 'Pull' }, { label: 'Legs' }, { label: 'Rest', rest: true }] },
    },
    {
      id: 'read', name: es ? 'Leer' : 'Read', icon: 'book', color: 'accent', record: 'amount', unit: es ? 'páginas' : 'pages',
      minimal: es ? '1 página' : '1 page', start: addDays(today, -20), end: null, reminder: '21:30',
      freq: { type: 'perWeek', times: 3 },
    },
    {
      id: 'treatment', name: es ? 'Tratamiento' : 'Treatment', icon: 'pill', color: 'mint', record: 'check',
      start: addDays(today, -8), end: addDays(today, 12), reminder: '09:00',
      freq: { type: 'everyN', n: 2, anchor: 'calendar' },
    },
    {
      id: 'plants', name: es ? 'Regar plantas' : 'Water plants', icon: 'plant', color: 'sky', record: 'check',
      start: addDays(today, -15), end: null, reminder: '18:00',
      freq: { type: 'everyN', n: 3, anchor: 'relative' },
    },
  ];
}

/** Past logs: mostly done, one minimum every fifth time and a miss every seventh. */
export function sampleLogs(activities: Activity[], today: DateKey): Log[] {
  const out: Log[] = [];
  const map = new Map<string, Log['state']>();
  const L = (id: string, d: DateKey) => map.get(`${id}|${d}`) ?? null;
  for (const a of activities) {
    let i = 0;
    for (let d = a.start; isBefore(d, today); d = addDays(d, 1)) {
      if (!isDue(a, d, L)) continue;
      i++;
      if (a.freq.type === 'perWeek' && i % 2 === 0) continue;
      if (i % 7 === 0) continue;
      const state = i % 5 === 0 ? 'min' : 'done';
      map.set(`${a.id}|${d}`, state);
      out.push({ activityId: a.id, date: d, state, value: a.record === 'amount' ? 12 + (i % 4) * 5 : null });
    }
  }
  return out;
}
