import { resolve } from 'node:path';
import { Command } from 'commander';
import { c, printHeader, printInfo, printSuccess, printWarning } from '../lib/colors.js';
import { convexEnvSet } from '../lib/convex-cli.js';
import {
  backupEnvFile,
  getEnvValue,
  readEnvFile,
  setEnvValue,
  writeEnvFile,
} from '../lib/env-file.js';

const APP_DIR = resolve(process.cwd(), 'floorplan-app');
const ENV_PROD = resolve(APP_DIR, '.env.production');
const ENV_DEV = resolve(APP_DIR, '.env.development');

const CONVEX_SYNC_VARS = [
  'SITE_URL',
  'CONVEX_SITE_URL',
  'BETTER_AUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SUPER_ADMIN_EMAIL',
  'ALLOWED_ORIGINS',
];

export function createEnvCommand(): Command {
  const cmd = new Command('env').description('Environment file management');

  cmd
    .command('update-production')
    .description('Update .env.production from current config')
    .option('--yes', 'Skip confirmation', false)
    .action((opts: { yes: boolean }) => {
      const file = readEnvFile(ENV_PROD);
      // Ensure all required keys exist
      const defaults: Record<string, string> = {
        DEV_AUTH_BYPASS: 'false',
        VITE_MOCK_MODE: 'false',
        NODE_ENV: 'production',
      };
      for (const [key, value] of Object.entries(defaults)) {
        if (!getEnvValue(file, key)) {
          setEnvValue(file, key, value);
        }
      }
      if (opts.yes) {
        backupEnvFile(ENV_PROD);
        writeEnvFile(file);
        printSuccess('Updated .env.production');
      } else {
        printInfo('Run with --yes to apply changes');
      }
    });

  cmd
    .command('update-local')
    .description('Update .env.development for local domain testing')
    .option('--domain <domain>', 'Local domain to use')
    .option('--yes', 'Skip confirmation', false)
    .action((opts: { domain?: string; yes: boolean }) => {
      const prod = readEnvFile(ENV_PROD);
      const dev = readEnvFile(ENV_DEV);
      const domain = opts.domain || getEnvValue(prod, 'BETTER_AUTH_URL') || 'http://localhost:3000';
      setEnvValue(dev, 'BETTER_AUTH_URL', domain);
      setEnvValue(dev, 'SITE_URL', domain);
      if (opts.yes) {
        backupEnvFile(ENV_DEV);
        writeEnvFile(dev);
        printSuccess('Updated .env.development');
      } else {
        printInfo('Run with --yes to apply changes');
      }
    });

  cmd
    .command('sync-to-convex')
    .description('Sync env vars to Convex cloud')
    .option('--vars <vars>', 'Comma-separated list of vars to sync')
    .option('--yes', 'Skip confirmation', false)
    .action((opts: { vars?: string; yes: boolean }) => {
      const file = readEnvFile(ENV_PROD);
      const varsToSync = opts.vars ? opts.vars.split(',') : CONVEX_SYNC_VARS;

      printHeader('Syncing to Convex');
      for (const key of varsToSync) {
        let value = getEnvValue(file, key);
        if (key === 'ALLOWED_ORIGINS' && !value) {
          const domain = getEnvValue(file, 'BETTER_AUTH_URL');
          if (domain) value = domain;
        }
        if (key === 'CONVEX_SITE_URL') {
          value = getEnvValue(file, 'VITE_CONVEX_SITE_URL');
        }
        if (!value) {
          printWarning(`Skipping ${key}: not set in .env.production`);
          continue;
        }
        if (opts.yes) {
          convexEnvSet(key, value);
          printSuccess(`Synced ${key}`);
        } else {
          printInfo(`Would sync ${key}=${key.includes('SECRET') ? '***' : value}`);
        }
      }
      if (!opts.yes) {
        printWarning('Run with --yes to apply changes');
      }
    });

  return cmd;
}
