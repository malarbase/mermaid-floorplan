import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';
import { resolve } from 'path';

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'convex/**/*.test.ts'],
    exclude: ['node_modules/**'],
    setupFiles: ['./src/test/setup.ts'],
    server: {
      deps: {
        inline: [/solid-js/, /@solidjs/],
      },
    },
  },
  resolve: {
    conditions: ['development', 'browser'],
    alias: {
      '~': resolve(__dirname, 'src'),
    },
  },
});
