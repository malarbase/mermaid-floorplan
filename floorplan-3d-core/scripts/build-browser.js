#!/usr/bin/env node
/**
 * Build the browser bundle for floorplan-3d-core
 * 
 * This script creates an IIFE bundle that:
 * - Exposes FloorplanCore as a global
 * - Uses window.THREE as the Three.js dependency (must be loaded first)
 */

import * as esbuild from 'esbuild';

// Plugin to make 'three' use the global window.THREE
const threeGlobalPlugin = {
  name: 'three-global',
  setup(build) {
    // Mark 'three' as external and resolve it to a virtual module
    build.onResolve({ filter: /^three$/ }, () => ({
      path: 'three',
      namespace: 'three-global',
    }));

    // Return code that exports window.THREE
    build.onLoad({ filter: /.*/, namespace: 'three-global' }, () => ({
      contents: `
        if (typeof window === 'undefined' || typeof window.THREE === 'undefined') {
          throw new Error('Three.js must be loaded before floorplan-3d-core (window.THREE is undefined)');
        }
        module.exports = window.THREE;
      `,
      loader: 'js',
    }));
  },
};

// Plugin to handle optional peer dependencies (three-bvh-csg and its transitive deps)
const optionalPeerDepsPlugin = {
  name: 'optional-peer-deps',
  setup(build) {
    // Mark optional peer dependencies and their transitive deps as external
    // These will only be available if the consuming app installs them
    const optionalDeps = ['three-bvh-csg', 'three-mesh-bvh'];
    
    build.onResolve({ filter: new RegExp(`^(${optionalDeps.join('|')})$`) }, (args) => ({
      path: args.path,
      external: true,
    }));
  },
};

async function build() {
  try {
    const result = await esbuild.build({
      entryPoints: ['src/index.ts'],
      bundle: true,
      format: 'iife',
      globalName: 'FloorplanCore',
      outfile: 'out/floorplan-3d-core.browser.js',
      plugins: [threeGlobalPlugin, optionalPeerDepsPlugin],
      minify: false,
      sourcemap: false,
    });

    if (result.errors.length > 0) {
      console.error('Build failed:', result.errors);
      process.exit(1);
    }

    console.log('  out/floorplan-3d-core.browser.js');
    console.log('\n⚡ Done');
  } catch (error) {
    console.error('Build error:', error);
    process.exit(1);
  }
}

build();

