/**
 * Activity icons: native symbols on every platform (SF Symbols on iOS, Material on Android/web).
 * Keys are what gets stored in `Activity.icon`.
 */
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

type IconName = SymbolViewProps['name'];

export const ICONS = {
  barbell: { ios: 'dumbbell', android: 'fitness_center', web: 'fitness_center' },
  book: { ios: 'book', android: 'menu_book', web: 'menu_book' },
  pill: { ios: 'pills', android: 'medication', web: 'medication' },
  plant: { ios: 'leaf', android: 'local_florist', web: 'local_florist' },
  water: { ios: 'drop', android: 'water_drop', web: 'water_drop' },
  guitar: { ios: 'guitars', android: 'music_note', web: 'music_note' },
  meditate: { ios: 'figure.mind.and.body', android: 'self_improvement', web: 'self_improvement' },
  run: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' },
  write: { ios: 'pencil', android: 'edit', web: 'edit' },
  dog: { ios: 'pawprint', android: 'pets', web: 'pets' },
  phone: { ios: 'phone', android: 'call', web: 'call' },
  food: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  sleep: { ios: 'bed.double', android: 'bedtime', web: 'bedtime' },
  clean: { ios: 'sparkles', android: 'cleaning_services', web: 'cleaning_services' },
  study: { ios: 'graduationcap', android: 'school', web: 'school' },
  language: { ios: 'globe', android: 'translate', web: 'translate' },
  bike: { ios: 'bicycle', android: 'directions_bike', web: 'directions_bike' },
  brain: { ios: 'brain', android: 'psychology', web: 'psychology' },
  star: { ios: 'star', android: 'star', web: 'star' },
  heart: { ios: 'heart', android: 'favorite', web: 'favorite' },
} as const satisfies Record<string, IconName>;

export type IconKey = keyof typeof ICONS;
export const ICON_KEYS = Object.keys(ICONS) as IconKey[];

export function ActivityIcon({ name, color, size = 22 }: { name: string; color: ColorValue; size?: number }) {
  const key = (name in ICONS ? name : 'star') as IconKey;
  return <SymbolView name={ICONS[key]} tintColor={color} size={size} />;
}
