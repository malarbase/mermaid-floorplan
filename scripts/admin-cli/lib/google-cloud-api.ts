import { readFileSync } from 'node:fs';
import { c, printError, printInfo, printSuccess, printWarning } from './colors.js';

export interface GoogleCloudConfig {
  clientId: string;
  serviceAccountPath?: string;
}

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key: string;
  client_email: string;
  token_uri: string;
}

async function getAccessToken(config: GoogleCloudConfig): Promise<string | undefined> {
  if (!config.serviceAccountPath) return undefined;
  try {
    const key: ServiceAccountKey = JSON.parse(readFileSync(config.serviceAccountPath, 'utf-8'));
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: key.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: key.token_uri,
      iat: now,
      exp: now + 3600,
    };
    // JWT signing would require crypto - for now we return undefined and print instructions
    printWarning(
      'Google Cloud API automation requires JWT signing. Using manual instructions for now.',
    );
    return undefined;
  } catch (err) {
    printError(`Failed to load service account: ${err}`);
    return undefined;
  }
}

export async function updateGoogleOAuthClient(
  config: GoogleCloudConfig,
  domain: string,
  dryRun = false,
): Promise<boolean> {
  const redirectUri = `https://${domain}/api/auth/callback/google`;
  const origin = `https://${domain}`;

  if (dryRun) {
    printInfo(`[DRY-RUN] Would update Google OAuth client ${c.code(config.clientId)}`);
    printInfo(`  Add origin: ${origin}`);
    printInfo(`  Add redirect: ${redirectUri}`);
    return true;
  }

  const token = await getAccessToken(config);
  if (!token) {
    printWarning('Google Cloud API automation not available. Manual instructions:');
    console.log(
      `  1. Visit: https://console.cloud.google.com/apis/credentials?project=${config.clientId.split('-')[0]}`,
    );
    console.log(`  2. Edit OAuth 2.0 client: ${config.clientId}`);
    console.log(`  3. Add Authorized JavaScript origin: ${origin}`);
    console.log(`  4. Add Authorized redirect URI: ${redirectUri}`);
    return false;
  }

  // Would call Google Identity Toolkit API here with the token
  printInfo('Google OAuth client update via API not yet implemented');
  return false;
}
