import { defineConfig, type Plugin } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sharedStylesPath = resolve(__dirname, '../floorplan-viewer-core/src/ui/shared-styles.css');

// Custom plugin to serve shared-styles.css during dev
function serveSharedStyles(): Plugin {
  return {
    name: 'serve-shared-styles',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/shared-styles.css') {
          res.setHeader('Content-Type', 'text/css');
          res.end(readFileSync(sharedStylesPath, 'utf-8'));
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
    serveSharedStyles(),
    viteStaticCopy({
      targets: [
        {
          src: '../floorplan-viewer-core/src/ui/shared-styles.css',
          dest: '.'  // copies to dist root
        }
      ]
    })
  ],
  optimizeDeps: {
    include: ['three', 'monaco-editor'],
  },
  resolve: {
    dedupe: ['three', 'monaco-editor'],
  },
  server: {
    fs: {
      // Allow serving files from the parent project (for accessing viewer-core CSS)
      allow: ['..', '../..']
    }
  }
});
