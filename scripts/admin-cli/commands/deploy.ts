import { resolve } from 'node:path';
import { Command } from 'commander';
import {
  c,
  printError,
  printHeader,
  printInfo,
  printSuccess,
  printWarning,
} from '../lib/colors.js';
import { getEnvValue, readEnvFile } from '../lib/env-file.js';
import { isValidConvexUrl, isValidDomain, isValidEmail, isValidUrl } from '../lib/validators.js';

const APP_DIR = resolve(process.cwd(), 'floorplan-app');
const ENV_PROD = resolve(APP_DIR, '.env.production');

const REQUIRED_VARS = [
  'VITE_CONVEX_URL',
  'CONVEX_DEPLOYMENT',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'SITE_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SUPER_ADMIN_EMAIL',
];

export function createDeployCommand(): Command {
  const cmd = new Command('deploy').description('Deployment verification');

  cmd
    .command('check')
    .description('Pre-deploy checklist')
    .action(() => {
      const file = readEnvFile(ENV_PROD);
      const issues: string[] = [];

      for (const key of REQUIRED_VARS) {
        const value = getEnvValue(file, key);
        if (!value || value.startsWith('your-') || value.startsWith('CHANGE-ME')) {
          issues.push(`${key} is not set or is a placeholder`);
        }
      }

      const secret = getEnvValue(file, 'BETTER_AUTH_SECRET');
      if (secret === 'CHANGE-ME-IN-PRODUCTION-USE-STRONG-RANDOM-SECRET') {
        issues.push('BETTER_AUTH_SECRET is the dev placeholder');
      }

      const domain = getEnvValue(file, 'BETTER_AUTH_URL');
      if (domain && domain.includes('localhost')) {
        issues.push('BETTER_AUTH_URL contains localhost');
      }

      const siteUrl = getEnvValue(file, 'SITE_URL');
      if (siteUrl && siteUrl.includes('localhost')) {
        issues.push('SITE_URL contains localhost');
      }

      const bypass = getEnvValue(file, 'DEV_AUTH_BYPASS');
      const mockMode = getEnvValue(file, 'VITE_MOCK_MODE');
      if (bypass === 'true') issues.push('DEV_AUTH_BYPASS must be false for production');
      if (mockMode === 'true') issues.push('VITE_MOCK_MODE must be false for production');

      printHeader('Pre-Deploy Checklist');
      if (issues.length === 0) {
        printSuccess('All checks passed! Ready to deploy.');
      } else {
        printError(`Found ${issues.length} issue(s):`);
        for (const issue of issues) console.log(`  - ${issue}`);
        process.exit(1);
      }
    });

  cmd
    .command('verify')
    .description('Post-deploy verification')
    .action(() => {
      const file = readEnvFile(ENV_PROD);
      const domain = getEnvValue(file, 'BETTER_AUTH_URL');

      printHeader('Post-Deploy Verification');
      if (!domain) {
        printError('BETTER_AUTH_URL not set');
        process.exit(1);
      }

      printInfo(`Checking ${domain}...`);
      printWarning(
        'Automated post-deploy verification requires HTTP requests. Implement with fetch/node-fetch.',
      );
      printSuccess('Manual verification checklist:');
      console.log(`  1. App loads at ${domain}`);
      console.log(`  2. OAuth callback works: ${domain}/api/auth/callback/google`);
      console.log(`  3. Admin panel loads: ${domain}/admin`);
      console.log(`  4. SSL certificate is valid`);
    });

  return cmd;
}
