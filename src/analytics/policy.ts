/**
 * Where usage analytics (PostHog) and crash reporting (Sentry) may run at all (TR-77, owner decision
 * 2026-10-19). The first iOS release is declared "Data Not Collected" on the App Store and its policy
 * says the app transmits nothing, so on iOS both stay off even if a key reaches the build: EAS
 * environment variables belong to an environment, not to a platform, and the same `production`
 * environment builds the Google Play app. Android keeps what is live.
 *
 * Turning them on for iOS is a release decision: App Privacy and docs/privacy.html change first
 * (docs/RELEASE-IOS.md §5), then this function. Pure, so the rule is covered by tests.
 */
export function analyticsAllowed(os: string): boolean {
  return os !== 'ios';
}
