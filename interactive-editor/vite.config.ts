import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'monaco': ['monaco-editor'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['three', 'monaco-editor'],
  },
  resolve: {
    dedupe: ['three', 'monaco-editor'],
  },
});

