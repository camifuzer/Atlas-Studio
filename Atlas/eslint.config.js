import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const browserGlobals = {
  ...globals.browser,
  L: 'readonly',
  XLSX: 'readonly',
};

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'releases/**', 'storage/**'],
  },
  {
    files: ['frontend/**/*.{js,jsx}'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: browserGlobals,
    },
    plugins: reactHooks.configs.flat.recommended.plugins,
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.flat.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      // O código atual sincroniza controladores externos com alguns efeitos; a migração será gradual.
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['js/**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: browserGlobals,
    },
    rules: {
      ...js.configs.recommended.rules,
      // Esses arquivos compartilham um escopo global e são validados em conjunto pelo build.
      'no-undef': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-redeclare': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs', 'vite.config.js', 'eslint.config.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
  },
  {
    files: ['scripts/*-smoke.mjs'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // As funções destes arquivos são serializadas e executadas dentro do editor no navegador.
      'no-undef': 'off',
    },
  },
  prettier,
];
