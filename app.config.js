// Extends app.json. Adds the Sentry plugin only when the org/project are configured,
// so the repo never contains account identifiers and a checkout without secrets still builds.
module.exports = ({ config }) => {
  const plugins = [...(config.plugins ?? [])];
  if (process.env.SENTRY_ORG && process.env.SENTRY_PROJECT) {
    plugins.push(['@sentry/react-native/expo', { organization: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT, url: 'https://sentry.io/' }]);
  }
  return { ...config, plugins };
};
