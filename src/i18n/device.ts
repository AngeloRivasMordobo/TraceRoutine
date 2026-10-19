/**
 * The device's preferred languages, in the user's order. Kept apart from `./index` so the
 * dictionaries stay free of native modules (and testable in Node).
 *
 * expo-localization reads the system list (on iOS it already reflects a per-app language
 * chosen in Settings → TraceRoutine → Language). If the native module is unavailable we fall
 * back to the JS engine's locale, and to English after that.
 */
import { getLocales } from 'expo-localization';

export function deviceLocaleTags(): string[] {
  try {
    const tags = getLocales().map((l) => l.languageTag);
    if (tags.length) return tags;
  } catch {
    // fall through to Intl
  }
  try {
    return [Intl.DateTimeFormat().resolvedOptions().locale];
  } catch {
    return [];
  }
}
