// Sentry's Metro config uploads source maps on EAS builds when SENTRY_AUTH_TOKEN is set;
// without it, it behaves like the default Expo config.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
