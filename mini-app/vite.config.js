import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import path from 'node:path';

// 在 sass 编译前静默 node_modules 里的弃用警告
process.env.SASS_SILENCE_DEPRECATION_WARNINGS = 'global-builtin,import,legacy-js-api,if-function';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        silenceDeprecations: ['global-builtin', 'import', 'legacy-js-api', 'if-function'],
      },
    },
  },
});
