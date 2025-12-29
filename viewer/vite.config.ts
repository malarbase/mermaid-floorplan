import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './', // Use relative paths for assets
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    open: true
  }
});

