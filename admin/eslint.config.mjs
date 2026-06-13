// @ts-check
import eslint from '@eslint/js';
import vue from 'eslint-plugin-vue';
import vueTsConfig from '@vue/eslint-config-typescript';
import prettierConfig from '@vue/eslint-config-prettier';

export default [
  {
    ignores: ['dist', 'node_modules', 'src/auto-imports.d.ts', 'src/components.d.ts'],
  },
  eslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  ...vueTsConfig(),
  prettierConfig,
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
