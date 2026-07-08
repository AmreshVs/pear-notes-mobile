module.exports = {
  extends: 'universe/native',
  plugins: ['import', 'react-native'],
  ignorePatterns: ['editor-bundle/**', 'src/utils/tiptap-editor-bundle.ts'],
  rules: {
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    semi: ['error', 'never'],
    'no-extra-semi': 'error',
    'react-native/no-unused-styles': 'error',
  },
}
