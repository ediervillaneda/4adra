import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'istanbul',
      include: ['src/domain/**/*.ts', 'src/application/**/*.ts', 'src/presentation/**/*.ts'],
      // compositionRoot solo conecta adaptadores reales; lo cubre test/integration/me.integration.test.ts.
      exclude: ['src/presentation/compositionRoot.ts'],
      thresholds: {
        'src/domain/**/*.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'src/application/**/*.ts': { statements: 95, branches: 95, functions: 95, lines: 95 },
        'src/presentation/**/*.ts': { statements: 70, branches: 70, functions: 70, lines: 70 },
      },
    },
  },
});
