/**
 * Phosphor icons, as the Nocturne readme requires ("Use Phosphor icons throughout")
 * and as the design canvas draws every screen. `ICONS` keys are what gets stored in
 * `Activity.icon`; `UI` holds the interface glyphs the design names per screen.
 * Weight follows the design: regular everywhere, fill for an active nav tab.
 */
import {
  ArrowBendUpRightIcon,
  ArrowsClockwiseIcon,
  BarbellIcon,
  BedIcon,
  BellIcon,
  BicycleIcon,
  BookOpenIcon,
  BrainIcon,
  BroomIcon,
  CalendarDotsIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  CheckIcon,
  DownloadSimpleIcon,
  DropIcon,
  FlowerLotusIcon,
  ForkKnifeIcon,
  GearIcon,
  GlobeIcon,
  GraduationCapIcon,
  GuitarIcon,
  HandTapIcon,
  HeartIcon,
  InfoIcon,
  MoonIcon,
  PaintBrushIcon,
  PawPrintIcon,
  PencilIcon,
  PersonSimpleRunIcon,
  PhoneIcon,
  PillIcon,
  PlantIcon,
  PlusIcon,
  RepeatIcon,
  ShareNetworkIcon,
  ShuffleIcon,
  SquaresFourIcon,
  StarIcon,
  TranslateIcon,
  TrashIcon,
  type Icon,
  type IconWeight,
} from 'phosphor-react-native';
import type { ColorValue } from 'react-native';

/** Activity icons. The first eight are the design's editor picker, in its order. */
export const ICONS = {
  paint: PaintBrushIcon,
  barbell: BarbellIcon,
  book: BookOpenIcon,
  meditate: FlowerLotusIcon,
  water: DropIcon,
  pill: PillIcon,
  plant: PlantIcon,
  guitar: GuitarIcon,
  run: PersonSimpleRunIcon,
  write: PencilIcon,
  dog: PawPrintIcon,
  phone: PhoneIcon,
  food: ForkKnifeIcon,
  sleep: BedIcon,
  clean: BroomIcon,
  study: GraduationCapIcon,
  language: TranslateIcon,
  bike: BicycleIcon,
  brain: BrainIcon,
  star: StarIcon,
  heart: HeartIcon,
} as const satisfies Record<string, Icon>;

export type IconKey = keyof typeof ICONS;
export const ICON_KEYS = Object.keys(ICONS) as IconKey[];

/** Interface glyphs, named as the design uses them. */
export const UI = {
  today: CheckCircleIcon,
  month: SquaresFourIcon,
  stats: ChartLineUpIcon,
  settings: GearIcon,
  plus: PlusIcon,
  check: CheckIcon,
  share: ShareNetworkIcon,
  back: CaretLeftIcon,
  forward: CaretRightIcon,
  globe: GlobeIcon,
  theme: MoonIcon,
  bell: BellIcon,
  download: DownloadSimpleIcon,
  trash: TrashIcon,
  tap: HandTapIcon,
  info: InfoIcon,
  skip: ArrowBendUpRightIcon,
  repeat: RepeatIcon,
  calendar: CalendarDotsIcon,
  shuffle: ShuffleIcon,
  cycle: ArrowsClockwiseIcon,
} as const satisfies Record<string, Icon>;

export type UIIconKey = keyof typeof UI;

export function ActivityIcon({ name, color, size = 22, weight = 'regular' }: { name: string; color: ColorValue; size?: number; weight?: IconWeight }) {
  const Glyph = ICONS[(name in ICONS ? name : 'star') as IconKey];
  return <Glyph color={color as string} size={size} weight={weight} />;
}

export function UIIcon({ name, color, size = 18, weight = 'regular' }: { name: UIIconKey; color: ColorValue; size?: number; weight?: IconWeight }) {
  const Glyph = UI[name];
  return <Glyph color={color as string} size={size} weight={weight} />;
}
