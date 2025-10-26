import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    onConsoleLog: (log, type) => {
      if (['log', 'info', 'debug'].includes(type)) return false;
      return undefined;
    },
    globals: true,
    css: true,
  },
});
