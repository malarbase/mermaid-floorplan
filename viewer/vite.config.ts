import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  // Use '/mermaid-floorplan/' for GitHub Pages deployment
  // Local dev will work with relative paths
  base: process.env.GITHUB_ACTIONS ? '/mermaid-floorplan/' : './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    open: true,
    fs: {
      // Allow serving files from the parent project (for worktrees accessing shared node_modules)
      allow: ['..', '../..']
    }
  }
});

