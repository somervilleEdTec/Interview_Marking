export default [
  {
    ignores: ['out/**', 'release/**', 'node_modules/**', 'dist/**', '**/*.{ts,tsx}']
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    }
  }
]
