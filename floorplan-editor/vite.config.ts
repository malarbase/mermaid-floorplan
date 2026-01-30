import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Paths to workspace packages for direct source imports during development
// This enables Tailwind to scan source TSX files for utility classes
const viewerCoreSrc = resolve(__dirname, '../floorplan-viewer-core/src');
const languageSrc = resolve(__dirname, '../floorplan-language/src');
const floorplan3DCoreSrc = resolve(__dirname, '../floorplan-3d-core/src');
const floorplanCommonSrc = resolve(__dirname, '../floorplan-common/src');

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
  resolve: {
    alias: {
      // During development, import directly from source files for hot reload
      // This enables Tailwind's @source directive to scan TSX files
      'floorplan-viewer-core': viewerCoreSrc,
      'floorplan-language': languageSrc,
      'floorplan-3d-core': floorplan3DCoreSrc,
      'floorplan-common': floorplanCommonSrc,
    },
    dedupe: ['three', 'monaco-editor', 'solid-js'],
  },
  plugins: [
    // Tailwind CSS v4 Vite plugin - processes CSS with @apply and DaisyUI
    tailwindcss(),
    solidPlugin({
      // Transform JSX from floorplan-viewer-core
      extensions: ['jsx', 'tsx'],
    }),
  ],
  css: {
    devSourcemap: true,
  },
  server: {
    fs: {
      // Allow serving files from the parent project (for accessing viewer-core CSS)
      allow: ['..', '../..']
    },
    watch: {
      // Watch workspace package source directories for changes
      ignored: ['!**/floorplan-viewer-core/src/**', '!**/floorplan-language/src/**', '!**/floorplan-3d-core/src/**', '!**/floorplan-common/src/**'],
    },
  }
});
