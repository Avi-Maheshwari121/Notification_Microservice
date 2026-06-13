module.exports = {
  testEnvironment: 'node',
  coverageProvider: 'v8',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'api/**/*.js',
    'workers/**/*.js',
    '!config/**/*.js' // Usually, we don't test simple config files
  ],
};