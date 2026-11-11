import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';

// Pruebas de integración dentro del runtime de Workers (Miniflare), con D1 local
// y las migraciones de backend/migrations aplicadas antes de cada archivo.
export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      // TODO(Task 4): usar wrangler.configPath cuando src/index.ts sea el Worker.
      miniflare: {
        compatibilityDate: '2026-11-01',
        compatibilityFlags: ['nodejs_compat'],
        d1Databases: ['DB'],
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(path.resolve('migrations')),
          BETTER_AUTH_URL: 'http://localhost:8787',
          BETTER_AUTH_SECRET: 'test-secret-at-least-32-characters-long',
          GOOGLE_CLIENT_ID: '',
          GOOGLE_CLIENT_SECRET: '',
        },
      },
    })),
  ],
  test: {
    include: ['test/integration/**/*.integration.test.ts'],
    setupFiles: ['test/integration/applyMigrations.ts'],
    globals: false,
  },
});
