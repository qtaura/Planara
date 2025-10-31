import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    // Ensure jsdom has a proper URL so localStorage and other APIs work
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    setupFiles: ['./test/setup.ts'],
    // Use forks with single worker to reduce memory and stabilize on Windows
    pool: 'forks',
    isolate: false,
    // Reduce concurrency to avoid Windows worker crashes / OOM
    poolOptions: {
      forks: {
        maxForks: 1,
        minForks: 1,
      },
    },
    onConsoleLog: (log, type) => {
      if (['log', 'info', 'debug'].includes(type)) return false;
      return undefined;
    },
    globals: true,
    css: true,
  },
});
