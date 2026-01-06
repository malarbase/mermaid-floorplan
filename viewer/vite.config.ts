import { defineConfig, type Plugin } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sharedStylesPath = resolve(__dirname, '../viewer-core/src/ui/shared-styles.css');

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
  root: '.',
  // Use '/mermaid-floorplan/' for GitHub Pages deployment
  // Local dev will work with relative paths
  base: process.env.GITHUB_ACTIONS ? '/mermaid-floorplan/' : './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [
    serveSharedStyles(),
    viteStaticCopy({
      targets: [
        {
          src: '../viewer-core/src/ui/shared-styles.css',
          dest: '.'  // copies to dist root
        }
      ]
    })
  ],
  server: {
    open: true,
    fs: {
      // Allow serving files from the parent project (for worktrees accessing shared node_modules)
      allow: ['..', '../..']
    }
  }
});
