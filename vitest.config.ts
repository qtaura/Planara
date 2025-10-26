import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    onConsoleLog: (log, type) => {
      if (['log', 'info', 'debug'].includes(type)) return false;
      return undefined;
    },
    reporters: 'default',
  },
});
