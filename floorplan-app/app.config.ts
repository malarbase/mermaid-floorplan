import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@solidjs/start/config';
import tailwindcss from '@tailwindcss/vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Paths to workspace packages for direct source imports during development
const viewerCoreSrc = resolve(__dirname, '../floorplan-viewer-core/src');
const languageSrc = resolve(__dirname, '../floorplan-language/src');
const floorplan3DCoreSrc = resolve(__dirname, '../floorplan-3d-core/src');
const floorplanCommonSrc = resolve(__dirname, '../floorplan-common/src');
const editorSrc = resolve(__dirname, '../floorplan-editor/src');

export default defineConfig({
  server: {
    preset: 'vercel',
  },
  ssr: true,
  vite: {
    plugins: [
      // Tailwind CSS v4 Vite plugin - processes CSS with DaisyUI
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // During development, import directly from source files for hot reload
        'floorplan-viewer-core': viewerCoreSrc,
        'floorplan-language': languageSrc,
        'floorplan-3d-core': floorplan3DCoreSrc,
        'floorplan-common': floorplanCommonSrc,
        'floorplan-editor': editorSrc,
      },
      // Prefer ESM over CommonJS to avoid "require is not defined" errors
      conditions: ['import', 'module', 'browser', 'default'],
      mainFields: ['module', 'jsnext:main', 'jsnext', 'browser', 'main'],
    },
    ssr: {
      // External packages that shouldn't be bundled for SSR
      external: ['three'],
      // Don't externalize better-auth - let it be bundled
      noExternal: ['better-auth'],
    },
    build: {
      // For client builds, provide a shim for require
      rollupOptions: {
        output: {
          // Ensure proper ESM output
          format: 'es',
        },
      },
    },
    optimizeDeps: {
      // Include packages that need pre-bundling
      include: [
        'solid-js',
        '@solidjs/router',
        'better-auth/solid',
        'better-auth/client',
        'convex/browser',
        'convex-solidjs',
      ],
    },
    css: {
      devSourcemap: true,
    },
    server: {
      fs: {
        // Allow serving files from the parent project (for workspace dependencies)
        allow: ['..', '../..'],
      },
      // Listen on all interfaces in Docker
      host: '0.0.0.0',
      port: 3000,
      strictPort: false, // Allow fallback to 3001 if needed
      // HMR configuration for Docker - overlay on HTTP connection
      hmr: {
        // Don't create a separate HMR server, overlay on main HTTP server
        overlay: true,
        // Client should connect back via the host machine
        clientPort: 3000,
      },
      // Enable hot reload with polling for Docker volumes
      watch: {
        usePolling: true,
        interval: 1000,
      },
    },
  },
});
