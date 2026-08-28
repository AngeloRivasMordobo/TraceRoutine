/**
 * Keeps the anonymous user properties fresh: how many activities are active and which
 * frequency types are in use. Counts and types only, never names.
 */
import { appStore } from '../store/appStore';
import { setUserProperties } from './index';

function snapshot() {
  const s = appStore.getState();
  const active = s.activities.filter((a) => !a.archived);
  const types = [...new Set(active.map((a) => a.freq.type))].sort().join(',');
  return { active_activities: active.length, frequency_types: types, lang: s.lang, theme: s.themeMode, reminders_enabled: active.some((a) => !!a.reminder) };
}

export function watchStoreForAnalytics(): () => void {
  let last = '';
  const push = () => {
    const props = snapshot();
    const key = JSON.stringify(props);
    if (key === last) return;
    last = key;
    setUserProperties(props);
  };
  push();
  return appStore.subscribe(push);
}
