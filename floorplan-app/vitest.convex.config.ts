import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['convex/**/*.test.ts'],
    exclude: ['node_modules/**'],
  },
});
