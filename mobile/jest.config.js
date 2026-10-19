module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.[jt]s'],
  transform: { '^.+\\.[jt]sx?$': ['@swc/jest', { jsc: { parser: { syntax: 'typescript', tsx: true }, target: 'es2020' }, module: { type: 'commonjs' } }] },
};
