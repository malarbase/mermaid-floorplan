import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Paths to workspace packages for direct source imports during development
const viewerCoreSrc = resolve(__dirname, '../floorplan-viewer-core/src');
const languageSrc = resolve(__dirname, '../floorplan-language/src');
const floorplan3DCoreSrc = resolve(__dirname, '../floorplan-3d-core/src');
const floorplanCommonSrc = resolve(__dirname, '../floorplan-common/src');

export default defineConfig({
  root: '.',
  // Use '/mermaid-floorplan/' for GitHub Pages deployment
  // Local dev will work with relative paths
  base: process.env.GITHUB_ACTIONS ? '/mermaid-floorplan/' : './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      // During development, import directly from source files for hot reload
      // This bypasses the compiled 'out/' directories
      'floorplan-viewer-core': viewerCoreSrc,
      'floorplan-language': languageSrc,
      'floorplan-3d-core': floorplan3DCoreSrc,
      'floorplan-common': floorplanCommonSrc,
    },
  },
  plugins: [
    // Tailwind CSS v4 Vite plugin - processes CSS with @apply and DaisyUI
    tailwindcss(),
    solidPlugin(),
  ],
  css: {
    devSourcemap: true,
  },
  server: {
    open: true,
    fs: {
      // Allow serving files from the parent project (for worktrees accessing shared node_modules)
      allow: ['..', '../..']
    },
    watch: {
      // Watch workspace package source directories for changes
      ignored: ['!**/floorplan-viewer-core/src/**', '!**/floorplan-language/src/**', '!**/floorplan-3d-core/src/**', '!**/floorplan-common/src/**'],
    },
  },
});
