/**
 * Stand-ins for the React Native modules the screens import, so a screen can be rendered to static
 * markup in Node (react-dom/server) and a test can read what it shows and press what it offers.
 * Host components keep their children; native-only pieces (SVG) render nothing. Only for tests:
 * `vi.mock('react-native', async () => (await import('../test/nativeStubs')).reactNativeStub)`.
 */
import { createElement, Fragment, isValidElement, type ReactNode } from 'react';

type Props = {
  children?: ReactNode;
  accessibilityLabel?: string;
  value?: unknown;
  onPress?: () => unknown;
  disabled?: boolean | null;
  visible?: boolean;
  /** Keyboard behaviour of scroll views and text fields, written out so a test can read it from the markup. */
  keyboardShouldPersistTaps?: string;
  keyboardDismissMode?: string;
  keyboardType?: string;
  autoCorrect?: boolean;
  placeholder?: string;
  style?: unknown;
};

/** A prop as a data attribute, or nothing when the screen leaves it unset. */
const attr = (v: unknown) => (v === undefined ? undefined : String(v));

/** A React Native style (object, nested arrays, falsy entries, or Pressable's function) as one object, unpressed. */
function flatStyle(style: unknown): Record<string, unknown> {
  if (typeof style === 'function') return flatStyle(style({ pressed: false }));
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatStyle));
  return style && typeof style === 'object' ? (style as Record<string, unknown>) : {};
}

/** The colours a test may check (a label against its background), as data attributes. */
const colours = (style: unknown) => {
  const s = flatStyle(style);
  return { 'data-bg': attr(s.backgroundColor), 'data-color': attr(s.color) };
};

/** The text inside a node, as a screen reader would read a button without a label. */
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

const host = (tag: string) =>
  function Host({ children, accessibilityLabel, value, keyboardShouldPersistTaps, keyboardDismissMode, keyboardType, autoCorrect, placeholder, style }: Props) {
    return createElement(
      tag,
      {
        'aria-label': accessibilityLabel,
        'data-value': attr(value),
        'data-keyboard-should-persist-taps': attr(keyboardShouldPersistTaps),
        'data-keyboard-dismiss-mode': attr(keyboardDismissMode),
        'data-keyboard-type': attr(keyboardType),
        'data-auto-correct': attr(autoCorrect),
        'data-placeholder': attr(placeholder),
        ...colours(style),
      },
      children,
    );
  };

type ListProps<T> = Props & {
  data: readonly T[];
  renderItem: (info: { item: T; index: number }) => ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  ListHeaderComponent?: ReactNode;
  ListFooterComponent?: ReactNode;
};

const ListHost = host('div');

/** A FlatList that renders every row between its header and footer, inside the same host as a ScrollView. */
function FlatList<T>({ data, renderItem, keyExtractor, ListHeaderComponent, ListFooterComponent, ...rest }: ListProps<T>) {
  const rows = data.map((item, index) => createElement(Fragment, { key: keyExtractor?.(item, index) ?? index }, renderItem({ item, index })));
  return createElement(ListHost, rest, ListHeaderComponent, ...rows, ListFooterComponent);
}

/** Animated values and springs that do nothing: the markup only needs the views. */
class AnimatedValue {
  constructor(public value = 0) {}
  setValue(v: number) { this.value = v; }
}

/** `Platform.OS` is mutable so one test file can render the same screen as iOS and as Android. */
export const platform = { OS: 'ios' as string, select: <T,>(o: Record<string, T>): T | undefined => o[platform.OS] ?? o.default };

/** Every Pressable of the last renders, by its label (or its text), with its handler. */
export const pressables: { label: string; onPress?: () => unknown; disabled: boolean }[] = [];
type AlertButton = { text?: string; onPress?: () => unknown };
/** Every `Alert.alert` call, with the texts of its buttons (and their handlers, for `tapAlert`). */
export const alerts: { title: string; body?: string; buttons: string[]; actions: AlertButton[] }[] = [];

/** Tap the button `text` of the last alert. */
export function tapAlert(text: string): unknown {
  const button = alerts.at(-1)?.actions.find((b) => b.text === text);
  if (!button) throw new Error(`The last alert has no "${text}" button`);
  return button.onPress?.();
}

/** Press the last rendered control labelled `label`, as a tap would. */
export function press(label: string): unknown {
  const target = [...pressables].reverse().find((p) => p.label === label);
  if (!target?.onPress || target.disabled) throw new Error(`Nothing to press labelled "${label}"`);
  return target.onPress();
}

export function resetStubs(): void {
  pressables.length = 0;
  alerts.length = 0;
}

export const reactNativeStub = {
  Platform: platform,
  View: host('div'),
  Text: host('span'),
  Pressable: function Pressable({ children, accessibilityLabel, onPress, disabled, style }: Props) {
    pressables.push({ label: accessibilityLabel ?? textOf(children), onPress, disabled: !!disabled });
    return createElement('button', { 'aria-label': accessibilityLabel, ...colours(style) }, children);
  },
  ScrollView: host('div'),
  FlatList,
  Animated: { View: host('div'), Value: AnimatedValue, spring: () => ({ start: () => {} }) },
  PanResponder: { create: () => ({ panHandlers: {} }) },
  KeyboardAvoidingView: host('div'),
  TextInput: host('input'),
  Switch: host('input'),
  Modal: ({ visible, children }: Props) => (visible ? createElement('dialog', null, children) : null),
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: (s: unknown) => s,
    absoluteFill: {},
    absoluteFillObject: {},
    hairlineWidth: 1,
  },
  Alert: {
    alert: (title: string, body?: string, buttons: AlertButton[] = []) => {
      alerts.push({ title, body, buttons: buttons.map((b) => b.text ?? ''), actions: buttons });
    },
  },
  Linking: { openURL: async () => {}, openSettings: async () => {} },
  AppState: { addEventListener: () => ({ remove: () => {} }) },
  useColorScheme: () => 'dark',
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
};

const nothing = () => null;
export const svgStub = { default: nothing, Svg: nothing, Circle: nothing, Defs: nothing, LinearGradient: nothing, Rect: nothing, Stop: nothing, Path: nothing, G: nothing };
