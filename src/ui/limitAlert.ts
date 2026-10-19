/**
 * The alert shown when one more activity would pass the active limit (TR-68), wherever that happens:
 * creating one in the editor, or bringing one back from the archive. Its copy and buttons per platform
 * come from `freeLimitPrompt` (iOS v1 states the limit with no upsell, TR-69).
 */
import { Alert, Platform } from 'react-native';
import { t } from '../i18n';
import { FREE_ACTIVE_LIMIT, freeLimitPrompt, type LimitRoute } from '../store/limits';

/**
 * `go` runs for a button that leads somewhere (Month on iOS, Settings on Android). Cancel closes the alert,
 * and runs `onCancel` when given.
 */
export function alertActiveLimit(go: (route: NonNullable<LimitRoute>) => void, onCancel?: () => void): void {
  const prompt = freeLimitPrompt(Platform.OS);
  Alert.alert(
    t(prompt.title, { limit: FREE_ACTIVE_LIMIT }),
    t(prompt.body),
    prompt.buttons.map(({ label, goTo }) => (goTo ? { text: t(label), onPress: () => go(goTo) } : { text: t(label), style: 'cancel' as const, onPress: onCancel })),
  );
}
