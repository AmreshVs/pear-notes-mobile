const expoPreset = require('jest-expo/jest-preset')

const TRANSFORMED_PACKAGES =
  '@pear-notes/core|react-redux|@reduxjs/toolkit|redux|immer|reselect|redux-thunk'

module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/test/**/*.test.{ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@pear-notes/core/(.*)$': '<rootDir>/node_modules/@pear-notes/core/$1',
  },
  transformIgnorePatterns: [
    expoPreset.transformIgnorePatterns[0].replace(
      'node_modules/',
      `node_modules/(?!(${TRANSFORMED_PACKAGES})/)`,
    ),
  ],
}
