/**
 * Stand-ins for the React Native modules the screens import, so a screen can be rendered to static
 * markup in Node (react-dom/server) and a test can read what it shows and press what it offers.
 * Host components keep their children; native-only pieces (SVG) render nothing. Only for tests:
 * `vi.mock('react-native', async () => (await import('../test/nativeStubs')).reactNativeStub)`.
 */
import { createElement, isValidElement, type ReactNode } from 'react';

type Props = { children?: ReactNode; accessibilityLabel?: string; value?: unknown; onPress?: () => unknown; disabled?: boolean | null; visible?: boolean };

/** The text inside a node, as a screen reader would read a button without a label. */
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

const host = (tag: string) =>
  function Host({ children, accessibilityLabel, value }: Props) {
    return createElement(tag, { 'aria-label': accessibilityLabel, 'data-value': value === undefined ? undefined : String(value) }, children);
  };

/** `Platform.OS` is mutable so one test file can render the same screen as iOS and as Android. */
export const platform = { OS: 'ios' as string, select: <T,>(o: Record<string, T>): T | undefined => o[platform.OS] ?? o.default };

/** Every Pressable of the last renders, by its label (or its text), with its handler. */
export const pressables: { label: string; onPress?: () => unknown; disabled: boolean }[] = [];
/** Every `Alert.alert` call, with the texts of its buttons. */
export const alerts: { title: string; body?: string; buttons: string[] }[] = [];

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
  Pressable: function Pressable({ children, accessibilityLabel, onPress, disabled }: Props) {
    pressables.push({ label: accessibilityLabel ?? textOf(children), onPress, disabled: !!disabled });
    return createElement('button', { 'aria-label': accessibilityLabel }, children);
  },
  ScrollView: host('div'),
  FlatList: host('div'),
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
    alert: (title: string, body?: string, buttons: { text?: string }[] = []) => {
      alerts.push({ title, body, buttons: buttons.map((b) => b.text ?? '') });
    },
  },
  Linking: { openURL: async () => {}, openSettings: async () => {} },
  AppState: { addEventListener: () => ({ remove: () => {} }) },
  useColorScheme: () => 'dark',
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
};

const nothing = () => null;
export const svgStub = { default: nothing, Svg: nothing, Circle: nothing, Defs: nothing, LinearGradient: nothing, Rect: nothing, Stop: nothing, Path: nothing, G: nothing };
