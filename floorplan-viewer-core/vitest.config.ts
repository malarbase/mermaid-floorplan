import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Note: Solid.js component tests are excluded because vite-plugin-solid
// affects module resolution for vscode-languageserver/langium packages.
// Solid component tests can be run separately with a dedicated config,
// or the components can be tested manually in the viewer/editor apps.
export default defineConfig({
  resolve: {
    alias: {
      // Resolve workspace packages from source so tests always see the latest
      // constants/exports without requiring a prior build step.  This mirrors
      // what floorplan-viewer/vite.config.ts does for the browser dev server.
      'floorplan-3d-core': resolve(__dirname, '../floorplan-3d-core/src'),
    },
  },
  test: {
    environment: 'node',
    // Exclude solid tests - they require vite-plugin-solid which conflicts
    // with langium/vscode-languageserver ESM resolution
    exclude: ['**/solid-*.test.ts', '**/node_modules/**'],
  },
});
