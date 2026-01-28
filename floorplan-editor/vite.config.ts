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
  plugins: [
    solidPlugin({
      // Transform JSX from floorplan-viewer-core
      extensions: ['jsx', 'tsx'],
    }),
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
  optimizeDeps: {
    include: ['three', 'monaco-editor', 'solid-js', 'solid-js/web'],
    // Don't pre-bundle viewer-core - let vite transform its JSX
    exclude: ['floorplan-viewer-core'],
  },
  resolve: {
    dedupe: ['three', 'monaco-editor', 'solid-js'],
  },
  server: {
    fs: {
      // Allow serving files from the parent project (for accessing viewer-core CSS)
      allow: ['..', '../..']
    }
  }
});
