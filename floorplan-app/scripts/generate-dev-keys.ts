/**
 * Generate dev RSA keypair for local JWT authentication.
 *
 * Run: npm run generate-dev-keys
 *
 * Outputs:
 *   dev-keys/private.pem        — RS256 private key (read server-side by /api/dev-auth)
 *   dev-keys/jwks.json          — Public key in JWKS format (for reference)
 *   dev-keys/jwks-data-uri.txt  — Base64 data URI of JWKS
 *
 * Also auto-patches:
 *   convex/auth.config.ts       — inline JWKS data URI between sentinel comments
 *
 * These are dev-only keys with no security value — safe to commit.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportJWK, exportPKCS8, generateKeyPair } from 'jose';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'dev-keys');
const authConfigPath = resolve(__dirname, '..', 'convex', 'auth.config.ts');

async function main() {
  // Ensure output directory exists (it's gitignored)
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  console.log('Generating RS256 keypair for dev auth...');

  const { publicKey, privateKey } = await generateKeyPair('RS256', {
    extractable: true,
  });

  // Export private key as PEM
  const privatePem = await exportPKCS8(privateKey);
  writeFileSync(resolve(outDir, 'private.pem'), privatePem, 'utf-8');
  console.log('  ✓ dev-keys/private.pem');

  // Export public key as JWK and wrap in JWKS
  const publicJwk = await exportJWK(publicKey);
  publicJwk.use = 'sig';
  publicJwk.kid = 'floorplan-dev-key';
  publicJwk.alg = 'RS256';

  const jwks = { keys: [publicJwk] };
  const jwksJson = JSON.stringify(jwks, null, 2);
  writeFileSync(resolve(outDir, 'jwks.json'), jwksJson, 'utf-8');
  console.log('  ✓ dev-keys/jwks.json');

  // Generate data URI for inline JWKS
  const jwksBase64 = Buffer.from(jwksJson).toString('base64');
  const dataUri = `data:text/plain;charset=utf-8;base64,${jwksBase64}`;
  writeFileSync(resolve(outDir, 'jwks-data-uri.txt'), dataUri, 'utf-8');
  console.log('  ✓ dev-keys/jwks-data-uri.txt');

  // Auto-patch convex/auth.config.ts with the new JWKS data URI
  patchAuthConfig(dataUri);

  console.log('\nDone! All files are in sync.');
}

/**
 * Replace the JWKS data URI in auth.config.ts between sentinel comments.
 * Looks for the region between @generated-jwks-start and @generated-jwks-end.
 */
function patchAuthConfig(dataUri: string) {
  const content = readFileSync(authConfigPath, 'utf-8');

  const startMarker = '// @generated-jwks-start';
  const endMarker = '// @generated-jwks-end';

  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    console.warn(
      '  ⚠ Could not find @generated-jwks-start/@generated-jwks-end in convex/auth.config.ts',
    );
    console.warn(
      '    Manually update the jwks value with the data URI from dev-keys/jwks-data-uri.txt',
    );
    return;
  }

  const before = content.slice(0, startIdx);
  const after = content.slice(endIdx);
  const newContent = `${before}${startMarker}\n      jwks: '${dataUri}',\n      ${after}`;

  writeFileSync(authConfigPath, newContent, 'utf-8');
  console.log('  ✓ convex/auth.config.ts (auto-patched JWKS)');
}

main().catch((err) => {
  console.error('Failed to generate dev keys:', err);
  process.exit(1);
});
