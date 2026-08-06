import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Config de test séparée de vite.config.js : les tests n'ont pas besoin du
 * plugin PWA (génération de service worker) et n'ont rien à faire des
 * worktrees Claude, qui contiennent des copies périmées des mêmes tests.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**'],
    environment: 'node',
    globals: false,
  },
});
