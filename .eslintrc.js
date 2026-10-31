module.exports = {
  extends: 'universe/native',
  plugins: ['import', 'react-native', 'simple-import-sort'],
  ignorePatterns: [
    'editor-bundle/**',
    'src/utils/tiptap-editor-bundle.ts',
    'qvac/**',
    'src/backend/backend.bundle.js',
  ],
  parserOptions: {
    warnOnUnsupportedTypeScriptVersion: false,
  },
  rules: {
    'simple-import-sort/imports': [
      'error',
      {
        groups: [
          // 0. Side-effect imports
          ['^\\u0000'],
          // 1. common 3rd party libs (react, react-native, expo, etc)
          ['^react', '^@?\\w'],
          // 2. @pear-notes/core
          ['^@pear-notes/core'],
          // 3. components, screen, lib, utils (aliases mapped via @/ or src/)
          ['^@/'],
          // 4. parent items (../)
          ['^\\.\\.(?!/?$)'],
          // 5. sibling/index items (./)
          ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
        ],
      },
    ],
    'simple-import-sort/exports': 'error',
    'import/order': 'off',
    semi: ['error', 'never'],
    'no-extra-semi': 'error',
    'react-native/no-unused-styles': 'error',
  },
  overrides: [
    {
      files: ['scripts/**/*.js'],
      env: { node: true },
    },
  ],
}
