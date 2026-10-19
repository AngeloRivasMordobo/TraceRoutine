// iOS-only app localizations: writes <lang>.lproj/InfoPlist.strings for every language in
// `props` (e.g. { en: './locales/en.json', es: './locales/es.json' }). The App Store lists an
// app's languages from those .lproj folders, and iOS uses them to offer the per-app language
// in Settings and to localize system UI (pickers, share sheet) for Spanish devices.
//
// It runs Expo's own iOS `locales` step. The top-level `locales` key is not used on purpose:
// it would also generate values-b+<lang>/strings.xml on Android, and the Android build that
// is live on Google Play should stay byte-for-byte as it is.
const { IOSConfig, withXcodeProject } = require('expo/config-plugins');

/** @type {import('expo/config-plugins').ConfigPlugin<Record<string, string>>} */
const withIosLocales = (config, locales) =>
  withXcodeProject(config, async (cfg) => {
    cfg.modResults = await IOSConfig.Locales.setLocalesAsync(
      { ...cfg, locales },
      { projectRoot: cfg.modRequest.projectRoot, project: cfg.modResults },
    );
    return cfg;
  });

module.exports = withIosLocales;
