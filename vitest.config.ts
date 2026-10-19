import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The app imports through the `@/` path alias (tsconfig.json); screen tests need it too.
  resolve: { alias: [{ find: /^@\//, replacement: fileURLToPath(new URL('./', import.meta.url)) }] },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: { include: ['src/engine/**', 'src/i18n/**'] },
  },
});
