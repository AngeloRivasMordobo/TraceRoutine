/**
 * The explanation shown before the system's notification permission alert (TR-58).
 *
 * On iOS it has a single "Continue" that leads straight to the system alert. App Review (guideline
 * 5.1.1(iv)) rejects a custom pre-permission message that lets people leave before they see the system
 * alert, or whose button reads like the system's own "Allow". Android keeps the two buttons that are
 * live on Google Play ("Not now" / "Turn on reminders"). Pure, so the rule is covered by tests.
 */
export function prePromptButtons(os: string): { label: string; asks: boolean }[] {
  return os === 'ios'
    ? [{ label: 'reminders.prePromptContinue', asks: true }]
    : [
        { label: 'reminders.prePromptLater', asks: false },
        { label: 'reminders.prePromptOk', asks: true },
      ];
}
