import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';

// Pruebas de integración dentro del runtime de Workers (Miniflare), con D1 local
// y las migraciones de backend/migrations aplicadas antes de cada archivo.
export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
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
