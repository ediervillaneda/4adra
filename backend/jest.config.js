/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/unit'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
  coverageThreshold: {
    'src/domain/**/*.ts': { statements: 100, branches: 100, functions: 100, lines: 100 },
    'src/application/**/*.ts': { statements: 95, branches: 95, functions: 95, lines: 95 },
  },
};
