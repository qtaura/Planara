import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@components': fileURLToPath(new URL('./components', import.meta.url)),
      '@styles': fileURLToPath(new URL('./styles', import.meta.url)),
      '@lib': fileURLToPath(new URL('./lib', import.meta.url)),
      '@types': fileURLToPath(new URL('./types', import.meta.url)),
      '@data': fileURLToPath(new URL('./data', import.meta.url)),
    },
  },
});
