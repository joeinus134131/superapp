/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'ecmascript',
          jsx: false,
          dynamicImport: true,
        },
        target: 'es2020',
      },
      module: {
        type: 'es6',
      },
    }],
  },
  extensionsToTreatAsEsm: [],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'lib/helpers.js',
    'lib/gamification.js',
    'lib/tokenSystem.js',
    '!lib/dictionaries.js',
  ],
};
