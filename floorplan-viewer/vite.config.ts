import { defineConfig, type Plugin } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Feature flag for DaisyUI migration (set VITE_USE_DAISYUI=false to use legacy styles)
const useDaisyUI = process.env.VITE_USE_DAISYUI !== 'false';

// Paths to style files
const tailwindStylesPath = resolve(__dirname, '../floorplan-viewer-core/src/ui/tailwind-styles.css');
const sharedStylesPath = resolve(__dirname, '../floorplan-viewer-core/src/ui/shared-styles.css');
const stylesPath = useDaisyUI ? tailwindStylesPath : sharedStylesPath;

// Paths to workspace packages for direct source imports during development
const viewerCoreSrc = resolve(__dirname, '../floorplan-viewer-core/src');
const languageSrc = resolve(__dirname, '../floorplan-language/src');
const floorplan3DCoreSrc = resolve(__dirname, '../floorplan-3d-core/src');
const floorplanCommonSrc = resolve(__dirname, '../floorplan-common/src');

// Custom plugin to serve styles during dev
function serveStyles(): Plugin {
  return {
    name: 'serve-styles',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Serve the appropriate styles file
        if (req.url === '/shared-styles.css' || req.url === '/tailwind-styles.css') {
          res.setHeader('Content-Type', 'text/css');
          res.end(readFileSync(stylesPath, 'utf-8'));
          return;
        }
        next();
      });
    }
  };
}

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
    solidPlugin(),
    serveStyles(),
    viteStaticCopy({
      targets: [
        {
          // Copy styles to dist - use Tailwind styles when enabled
          src: useDaisyUI 
            ? '../floorplan-viewer-core/src/ui/tailwind-styles.css'
            : '../floorplan-viewer-core/src/ui/shared-styles.css',
          dest: '.',
          rename: 'shared-styles.css'  // Keep same filename for backward compatibility
        }
      ]
    })
  ],
  css: {
    // PostCSS will be auto-configured from postcss.config.js
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
