/**
 * The device's preferred languages, in the user's order. Kept apart from `./index` so the
 * dictionaries stay free of native modules (and testable in Node).
 *
 * expo-localization reads the system list. On iOS it already reflects a per-app language chosen
 * in Settings → TraceRoutine → Language, and the store lets that newer choice win over an older
 * in-app pick (`resolveLang`). If getLocales() throws or returns nothing we fall back to the JS
 * engine's locale, and to an empty list after that (langFromLocales then picks English).
 *
 * This does not cover a missing native module: expo-localization looks it up when it is imported,
 * before this function runs. It is autolinked into every build, and web has its own implementation.
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
