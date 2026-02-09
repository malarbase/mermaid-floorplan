import { defineConfig } from 'vitest/config';

// Note: Solid.js component tests are excluded because vite-plugin-solid
// affects module resolution for vscode-languageserver/langium packages.
// Solid component tests can be run separately with a dedicated config,
// or the components can be tested manually in the viewer/editor apps.
export default defineConfig({
  test: {
    environment: 'node',
    // Exclude solid tests - they require vite-plugin-solid which conflicts
    // with langium/vscode-languageserver ESM resolution
    exclude: ['**/solid-*.test.ts', '**/node_modules/**'],
  },
});
