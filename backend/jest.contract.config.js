/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/contract'],
  testMatch: ['**/*.contract.test.ts'],
};
