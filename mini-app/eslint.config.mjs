// @ts-check
import eslint from '@eslint/js';
import vue from 'eslint-plugin-vue';

export default [
  {
    ignores: ['node_modules', 'unpackage', 'dist'],
  },
  eslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        uni: 'readonly',
        wx: 'readonly',
        getApp: 'readonly',
        getCurrentPages: 'readonly',
        UniApp: 'readonly',
        Page: 'readonly',
        App: 'readonly',
        Component: 'readonly',
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-multiple-template-root': 'off',
    },
  },
];
