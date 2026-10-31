import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window:    'readonly',
        document:  'readonly',
        localStorage: 'readonly',
        crypto:    'readonly',
        URL:       'readonly',
        Blob:      'readonly',
        File:      'readonly',
        alert:     'readonly',
        confirm:   'readonly',
        Chart:     'readonly',
      },
    },
    rules: {
      'no-unused-vars':    ['warn', { argsIgnorePattern: '^_' }],
      'no-console':        'off',
      'eqeqeq':            ['error', 'always'],
      'no-var':            'error',
      'prefer-const':      'error',
      'object-shorthand':  'warn',
      'no-throw-literal':  'error',
    },
  },
  {
    // Test files — relax some rules
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        describe: 'readonly',
        it:       'readonly',
        expect:   'readonly',
        beforeEach: 'readonly',
        vi:       'readonly',
      },
    },
  },
];
