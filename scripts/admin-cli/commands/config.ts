import { randomBytes } from 'node:crypto';
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
import { convexEnvSet } from '../lib/convex-cli.js';
import {
  clearAllCredentials,
  isKeyringAvailable,
  loadCredentials,
  migrateCredentialsToKeyring,
  setCredential,
} from '../lib/credentials.js';
import { createDnsRecords, type DnsConfig, verifyDnsPropagation } from '../lib/dns-api.js';
import {
  backupEnvFile,
  type EnvMode,
  getEnvValue,
  getEnvValueWithInheritance,
  inheritEnvValues,
  readEnvFile,
  resolveEnvFile,
  setEnvValue,
  writeEnvFile,
} from '../lib/env-file.js';
import { type GoogleCloudConfig, updateGoogleOAuthClient } from '../lib/google-cloud-api.js';
import {
  isValidConvexUrl,
  isValidDomain,
  isValidEmail,
  isValidGoogleClientId,
  isValidUrl,
} from '../lib/validators.js';
import { addVercelDomain, setVercelEnvVar, type VercelConfig } from '../lib/vercel-api.js';

const APP_DIR = resolve(process.cwd(), 'floorplan-app');
const ENV_LOCAL = resolve(APP_DIR, '.env.local');

function loadEnvFile(mode: EnvMode) {
  return readEnvFile(resolveEnvFile(mode));
}

function saveEnvFile(mode: EnvMode, file: ReturnType<typeof readEnvFile>, yes = false) {
  if (!yes) {
    printWarning('Use --yes to skip confirmation');
    return;
  }
  const path = resolveEnvFile(mode);
  backupEnvFile(path);
  writeEnvFile(file);
  printSuccess(`Updated ${path}`);
}

function resolveMode(opts: { env?: string; shared?: boolean }): EnvMode {
  if (opts.shared) return 'shared';
  if (opts.env === 'dev' || opts.env === 'development') return 'dev';
  if (opts.env === 'shared' || opts.env === 'base') return 'shared';
  return 'prod';
}

export function createConfigCommand(): Command {
  const cmd = new Command('config').description('Configuration management');

  // Global --env and --shared options applied to relevant subcommands
  const addEnvOptions = (sub: Command) =>
    sub
      .option('--env <mode>', 'Target environment: prod | dev | shared (default: prod)', 'prod')
      .option('--shared', 'Write to shared .env file (shorthand for --env=shared)', false);

  addEnvOptions(
    cmd
      .command('set-domain <domain>')
      .description('Set domain URL')
      .option('--yes', 'Skip confirmation', false)
      .action((domain: string, opts: { yes: boolean; env?: string; shared?: boolean }) => {
        if (!isValidDomain(domain)) {
          printError(`Invalid domain: ${domain}`);
          process.exit(1);
        }
        const mode = resolveMode(opts);
        const file = loadEnvFile(mode);
        const url = domain.startsWith('http') ? domain : `https://${domain}`;
        setEnvValue(file, 'BETTER_AUTH_URL', url);
        setEnvValue(file, 'SITE_URL', url);
        printInfo(`Setting domain to ${c.code(domain)} in ${c.code(mode)} env`);
        saveEnvFile(mode, file, opts.yes);
      }),
  );

  addEnvOptions(
    cmd
      .command('set-super-admin <email>')
      .description('Set super admin email')
      .option('--yes', 'Skip confirmation', false)
      .action((email: string, opts: { yes: boolean; env?: string; shared?: boolean }) => {
        if (!isValidEmail(email)) {
          printError(`Invalid email: ${email}`);
          process.exit(1);
        }
        const mode = resolveMode(opts);
        const file = loadEnvFile(mode);
        setEnvValue(file, 'SUPER_ADMIN_EMAIL', email);
        printInfo(`Setting super admin to ${c.code(email)} in ${c.code(mode)} env`);
        saveEnvFile(mode, file, opts.yes);
      }),
  );

  addEnvOptions(
    cmd
      .command('set-google-oauth <client-id> <client-secret>')
      .description('Set Google OAuth credentials')
      .option('--yes', 'Skip confirmation', false)
      .action(
        (
          clientId: string,
          secret: string,
          opts: { yes: boolean; env?: string; shared?: boolean },
        ) => {
          if (!isValidGoogleClientId(clientId)) {
            printError(`Invalid Google Client ID: ${clientId}`);
            process.exit(1);
          }
          const mode = resolveMode(opts);
          const file = loadEnvFile(mode);
          setEnvValue(file, 'GOOGLE_CLIENT_ID', clientId);
          setEnvValue(file, 'GOOGLE_CLIENT_SECRET', secret);
          printInfo(`Setting Google OAuth credentials in ${c.code(mode)} env`);
          saveEnvFile(mode, file, opts.yes);
        },
      ),
  );

  addEnvOptions(
    cmd
      .command('set-convex <cloud-url> <site-url>')
      .description('Set Convex cloud URLs')
      .option('--yes', 'Skip confirmation', false)
      .action(
        (
          cloudUrl: string,
          siteUrl: string,
          opts: { yes: boolean; env?: string; shared?: boolean },
        ) => {
          if (!isValidConvexUrl(cloudUrl, '.convex.cloud')) {
            printError(`Invalid Convex cloud URL: ${cloudUrl}`);
            process.exit(1);
          }
          if (!isValidConvexUrl(siteUrl, '.convex.site')) {
            printError(`Invalid Convex site URL: ${siteUrl}`);
            process.exit(1);
          }
          const mode = resolveMode(opts);
          const file = loadEnvFile(mode);
          setEnvValue(file, 'VITE_CONVEX_URL', cloudUrl);
          setEnvValue(file, 'VITE_CONVEX_SITE_URL', siteUrl);
          const deployment = cloudUrl.match(/https:\/\/(.+)\.convex\.cloud/)?.[1];
          if (deployment) {
            setEnvValue(
              file,
              'CONVEX_DEPLOYMENT',
              `${mode === 'prod' ? 'prod' : 'dev'}:${deployment}`,
            );
          }
          printInfo(`Setting Convex URLs in ${c.code(mode)} env`);
          saveEnvFile(mode, file, opts.yes);
        },
      ),
  );

  addEnvOptions(
    cmd
      .command('set-auth-secret [secret]')
      .description('Set or generate Better Auth secret')
      .option('--yes', 'Skip confirmation', false)
      .action(
        (secret: string | undefined, opts: { yes: boolean; env?: string; shared?: boolean }) => {
          const value = secret || randomBytes(32).toString('base64');
          const mode = resolveMode(opts);
          const file = loadEnvFile(mode);
          setEnvValue(file, 'BETTER_AUTH_SECRET', value);
          printInfo(
            `Setting auth secret in ${c.code(mode)} env (${secret ? 'provided' : 'generated'})`,
          );
          saveEnvFile(mode, file, opts.yes);
        },
      ),
  );

  cmd
    .command('show')
    .description('Show current configuration with inheritance')
    .option('--env <mode>', 'Target environment: prod | dev | shared (default: prod)', 'prod')
    .option('--shared', 'Show shared .env file only', false)
    .option('--raw', 'Show raw file contents without inheritance', false)
    .action((opts: { env?: string; shared?: boolean; raw?: boolean }) => {
      const mode = resolveMode(opts);
      printHeader(`Configuration — ${mode.toUpperCase()}`);

      const keys = [
        'BETTER_AUTH_URL',
        'SITE_URL',
        'VITE_CONVEX_URL',
        'VITE_CONVEX_SITE_URL',
        'CONVEX_DEPLOYMENT',
        'GOOGLE_CLIENT_ID',
        'SUPER_ADMIN_EMAIL',
        'DEV_AUTH_BYPASS',
        'VITE_MOCK_MODE',
        'NODE_ENV',
        'BETTER_AUTH_SECRET',
      ];

      if (opts.raw) {
        const file = loadEnvFile(mode);
        for (const key of keys) {
          const value = getEnvValue(file, key);
          if (value) {
            const display = key.includes('SECRET') ? '***' : value;
            console.log(`  ${c.bold(key)}: ${display}`);
          }
        }
      } else {
        for (const key of keys) {
          const value = getEnvValueWithInheritance(mode, key, ENV_LOCAL);
          if (value !== undefined) {
            const display = key.includes('SECRET') ? '***' : value;
            // Determine source
            const localFile = readEnvFile(ENV_LOCAL);
            const modeFile = readEnvFile(resolveEnvFile(mode));
            const sharedFile = readEnvFile(resolveEnvFile('shared'));
            let source = 'shared';
            if (getEnvValue(localFile, key) !== undefined) source = 'local';
            else if (getEnvValue(modeFile, key) !== undefined) source = mode;
            console.log(`  ${c.bold(key)}: ${display} ${c.dim(`(${source})`)}`);
          }
        }
      }
    });

  cmd
    .command('validate')
    .description('Validate configuration consistency')
    .option('--env <mode>', 'Target environment: prod | dev (default: prod)', 'prod')
    .action((opts: { env?: string }) => {
      const mode = opts.env === 'dev' || opts.env === 'development' ? 'dev' : 'prod';
      const file = loadEnvFile(mode);
      const issues: string[] = [];

      const domain = getEnvValue(file, 'BETTER_AUTH_URL');
      const siteUrl = getEnvValue(file, 'SITE_URL');
      if (domain && siteUrl) {
        const domainHost = new URL(domain).hostname;
        const siteHost = new URL(siteUrl).hostname;
        if (domainHost !== siteHost) {
          issues.push(`Domain mismatch: BETTER_AUTH_URL (${domainHost}) ≠ SITE_URL (${siteHost})`);
        }
      }

      const secret = getEnvValue(file, 'BETTER_AUTH_SECRET');
      if (
        !secret ||
        secret.length < 32 ||
        secret === 'CHANGE-ME-IN-PRODUCTION-USE-STRONG-RANDOM-SECRET'
      ) {
        issues.push('BETTER_AUTH_SECRET is too weak or is the placeholder');
      }

      if (mode === 'prod' && domain && !domain.startsWith('https://')) {
        issues.push('BETTER_AUTH_URL must use https:// in production');
      }

      const convexUrl = getEnvValue(file, 'VITE_CONVEX_URL');
      if (mode === 'prod' && convexUrl && !convexUrl.endsWith('.convex.cloud')) {
        issues.push('VITE_CONVEX_URL must end with .convex.cloud in production');
      }

      const convexSite = getEnvValue(file, 'VITE_CONVEX_SITE_URL');
      if (mode === 'prod' && convexSite && !convexSite.endsWith('.convex.site')) {
        issues.push('VITE_CONVEX_SITE_URL must end with .convex.site in production');
      }

      const googleId = getEnvValue(file, 'GOOGLE_CLIENT_ID');
      if (googleId && !googleId.endsWith('.apps.googleusercontent.com')) {
        issues.push('GOOGLE_CLIENT_ID must end with .apps.googleusercontent.com');
      }

      const adminEmail = getEnvValue(file, 'SUPER_ADMIN_EMAIL');
      if (adminEmail && !isValidEmail(adminEmail)) {
        issues.push('SUPER_ADMIN_EMAIL is not a valid email');
      }

      const bypass = getEnvValue(file, 'DEV_AUTH_BYPASS');
      const mockMode = getEnvValue(file, 'VITE_MOCK_MODE');
      if (mode === 'prod') {
        if (bypass === 'true') issues.push('DEV_AUTH_BYPASS must be false in production');
        if (mockMode === 'true') issues.push('VITE_MOCK_MODE must be false in production');
      }

      if (issues.length === 0) {
        printSuccess(`Configuration is valid for ${mode}`);
      } else {
        printWarning(`Found ${issues.length} issue(s) for ${mode}:`);
        for (const issue of issues) console.log(`  - ${issue}`);
        process.exit(1);
      }
    });

  cmd
    .command('inherit')
    .description('Copy missing values from one environment to another')
    .option('--from <mode>', 'Source environment: prod | dev | shared (default: prod)', 'prod')
    .option('--to <mode>', 'Target environment: prod | dev | shared (default: dev)', 'dev')
    .option('--keys <keys>', 'Comma-separated keys to copy (default: all)')
    .option('--yes', 'Skip confirmation', false)
    .option('--dry-run', 'Preview changes without applying', false)
    .action((opts: { from: string; to: string; keys?: string; yes: boolean; dryRun: boolean }) => {
      const fromMode = (
        opts.from === 'dev' || opts.from === 'development'
          ? 'dev'
          : opts.from === 'shared' || opts.from === 'base'
            ? 'shared'
            : 'prod'
      ) as EnvMode;
      const toMode = (
        opts.to === 'dev' || opts.to === 'development'
          ? 'dev'
          : opts.to === 'shared' || opts.to === 'base'
            ? 'shared'
            : 'prod'
      ) as EnvMode;

      if (fromMode === toMode) {
        printError('Source and target environments must be different');
        process.exit(1);
      }

      const keys = opts.keys ? opts.keys.split(',').map((k) => k.trim()) : undefined;

      printHeader(`Inherit: ${fromMode} → ${toMode}`);

      if (opts.dryRun) {
        const sourceFile = loadEnvFile(fromMode);
        const targetFile = loadEnvFile(toMode);
        const keysToCheck = keys ?? sourceFile.entries.filter((e) => e.key).map((e) => e.key);
        const wouldCopy: string[] = [];
        const wouldSkip: string[] = [];

        for (const key of keysToCheck) {
          const sourceVal = getEnvValue(sourceFile, key);
          const targetVal = getEnvValue(targetFile, key);
          if (sourceVal === undefined) continue;
          if (targetVal === undefined) wouldCopy.push(key);
          else wouldSkip.push(key);
        }

        if (wouldCopy.length > 0) {
          printInfo(`Would copy ${wouldCopy.length} key(s):`);
          for (const key of wouldCopy) console.log(`  + ${key}`);
        }
        if (wouldSkip.length > 0) {
          printInfo(`Would skip ${wouldSkip.length} existing key(s):`);
          for (const key of wouldSkip) console.log(`  = ${key}`);
        }
        return;
      }

      if (!opts.yes) {
        printWarning('Use --yes to apply inheritance');
        return;
      }

      const { copied, skipped } = inheritEnvValues(toMode, fromMode, keys);

      if (copied.length > 0) {
        printSuccess(`Copied ${copied.length} key(s) from ${fromMode} to ${toMode}:`);
        for (const key of copied) console.log(`  + ${key}`);
      }
      if (skipped.length > 0) {
        printInfo(`Skipped ${skipped.length} existing key(s):`);
        for (const key of skipped) console.log(`  = ${key}`);
      }
      if (copied.length === 0 && skipped.length === 0) {
        printInfo('No keys to copy');
      }
    });

  cmd
    .command('set-vercel-token <token>')
    .description('Set Vercel API token')
    .action((token: string) => {
      setCredential('vercelToken', token);
      printSuccess('Vercel token saved');
    });

  cmd
    .command('set-vercel-project-id <id>')
    .description('Set Vercel project ID')
    .action((id: string) => {
      setCredential('vercelProjectId', id);
      printSuccess('Vercel project ID saved');
    });

  cmd
    .command('set-google-credentials <path>')
    .description('Set Google Cloud service account key path')
    .action((path: string) => {
      setCredential('googleServiceAccountPath', path);
      printSuccess('Google Cloud credentials path saved');
    });

  cmd
    .command('set-dns-credentials <provider> <token> [zoneId]')
    .description('Set DNS provider credentials (cloudflare|route53|manual)')
    .action((provider: string, token: string, zoneId?: string) => {
      setCredential('dnsProvider', provider as 'cloudflare' | 'route53' | 'manual');
      setCredential('dnsToken', token);
      if (zoneId) setCredential('dnsZoneId', zoneId);
      printSuccess(`DNS provider ${provider} credentials saved`);
    });

  cmd
    .command('migrate-credentials')
    .description('Migrate sensitive credentials from .admin-cli.json to OS keyring')
    .action(() => {
      printHeader('Migrate Credentials to Keyring');
      if (!isKeyringAvailable()) {
        printError('OS keyring is not available on this system');
        printInfo(
          'On Linux, install libsecret and a secret service provider (e.g., gnome-keyring or kwallet)',
        );
        process.exit(1);
      }
      const migrated = migrateCredentialsToKeyring();
      if (migrated.length === 0) {
        printInfo('No credentials needed migration');
      } else {
        for (const key of migrated) {
          printSuccess(`Migrated ${key} to OS keyring`);
        }
      }
    });

  cmd
    .command('clear-credentials')
    .description('Clear all stored credentials from keyring and .admin-cli.json')
    .option('--yes', 'Skip confirmation', false)
    .action((opts: { yes: boolean }) => {
      printHeader('Clear All Credentials');
      if (!opts.yes) {
        printWarning('This will permanently delete all stored API tokens and credentials');
        printWarning('Use --yes to confirm');
        process.exit(1);
      }
      clearAllCredentials();
      printSuccess('All credentials cleared');
    });

  cmd
    .command('setup-all <domain>')
    .description('Full domain setup across all services')
    .option('--yes', 'Skip confirmations', false)
    .option('--dry-run', 'Preview changes without applying', false)
    .option('--skip-vercel', 'Skip Vercel configuration', false)
    .option('--skip-google', 'Skip Google OAuth update', false)
    .option('--skip-dns', 'Skip DNS record creation', false)
    .option('--skip-convex', 'Skip Convex env sync', false)
    .action(
      async (
        domain: string,
        opts: {
          yes: boolean;
          dryRun: boolean;
          skipVercel: boolean;
          skipGoogle: boolean;
          skipDns: boolean;
          skipConvex: boolean;
        },
      ) => {
        if (!isValidDomain(domain)) {
          printError(`Invalid domain: ${domain}`);
          process.exit(1);
        }

        const creds = loadCredentials();
        const file = loadEnvFile('prod');
        const url = `https://${domain}`;
        const result = {
          envFileUpdated: false,
          convexSynced: false,
          vercelDomainAdded: false,
          vercelEnvVarsSet: false,
          googleOAuthUpdated: false,
          dnsRecordsCreated: false,
          dnsVerified: false,
          issues: [] as string[],
        };

        printHeader(`Setup All: ${domain}`);

        // 1. Update .env.production
        printInfo('Step 1: Updating .env.production...');
        setEnvValue(file, 'BETTER_AUTH_URL', url);
        setEnvValue(file, 'SITE_URL', url);
        if (opts.dryRun) {
          printInfo(`[DRY-RUN] Would update BETTER_AUTH_URL and SITE_URL to ${url}`);
        } else if (opts.yes) {
          backupEnvFile(resolveEnvFile('prod'));
          writeEnvFile(file);
          result.envFileUpdated = true;
          printSuccess('Updated .env.production');
        } else {
          printWarning('Use --yes to apply env file changes');
        }

        // 2. Sync to Convex
        if (!opts.skipConvex) {
          printInfo('Step 2: Syncing to Convex...');
          try {
            if (opts.dryRun) {
              printInfo('[DRY-RUN] Would sync SITE_URL and ALLOWED_ORIGINS to Convex');
            } else if (opts.yes) {
              convexEnvSet('SITE_URL', url);
              convexEnvSet('ALLOWED_ORIGINS', url);
              result.convexSynced = true;
              printSuccess('Synced to Convex');
            }
          } catch (err) {
            result.issues.push(`Convex sync failed: ${err}`);
          }
        }

        // 3. Vercel
        if (!opts.skipVercel && creds.vercelToken) {
          printInfo('Step 3: Configuring Vercel...');
          const vConfig: VercelConfig = {
            token: creds.vercelToken,
            projectId: creds.vercelProjectId,
            teamId: creds.vercelTeamId,
          };
          result.vercelDomainAdded = await addVercelDomain(vConfig, domain, opts.dryRun);
          if (opts.yes && !opts.dryRun) {
            await setVercelEnvVar(vConfig, 'BETTER_AUTH_URL', url, opts.dryRun);
            await setVercelEnvVar(vConfig, 'SITE_URL', url, opts.dryRun);
            result.vercelEnvVarsSet = true;
          }
        } else if (!opts.skipVercel) {
          printWarning('Skipping Vercel: no token set. Run: config set-vercel-token <token>');
        }

        // 4. Google OAuth
        if (!opts.skipGoogle) {
          printInfo('Step 4: Updating Google OAuth...');
          const googleId = getEnvValue(file, 'GOOGLE_CLIENT_ID');
          if (googleId) {
            const gConfig: GoogleCloudConfig = {
              clientId: googleId,
              serviceAccountPath: creds.googleServiceAccountPath,
            };
            result.googleOAuthUpdated = await updateGoogleOAuthClient(gConfig, domain, opts.dryRun);
          } else {
            printWarning('Skipping Google OAuth: GOOGLE_CLIENT_ID not set in .env.production');
          }
        }

        // 5. DNS
        if (!opts.skipDns) {
          printInfo('Step 5: Creating DNS records...');
          const dConfig: DnsConfig = {
            provider: creds.dnsProvider || 'manual',
            token: creds.dnsToken,
            zoneId: creds.dnsZoneId,
          };
          result.dnsRecordsCreated = await createDnsRecords(
            dConfig,
            domain,
            'cname.vercel-dns.com',
            opts.dryRun,
          );
          if (result.dnsRecordsCreated && !opts.dryRun) {
            result.dnsVerified = await verifyDnsPropagation(domain, 'cname.vercel-dns.com');
          }
        }

        // Summary
        printHeader('Setup Summary');
        console.log(`  Env file updated:   ${result.envFileUpdated ? '✓' : '✗'}`);
        console.log(`  Convex synced:      ${result.convexSynced ? '✓' : '✗'}`);
        console.log(`  Vercel domain:      ${result.vercelDomainAdded ? '✓' : '✗'}`);
        console.log(`  Vercel env vars:    ${result.vercelEnvVarsSet ? '✓' : '✗'}`);
        console.log(`  Google OAuth:       ${result.googleOAuthUpdated ? '✓' : '✗'}`);
        console.log(`  DNS records:        ${result.dnsRecordsCreated ? '✓' : '✗'}`);
        console.log(`  DNS verified:       ${result.dnsVerified ? '✓' : '✗'}`);
        if (result.issues.length > 0) {
          printWarning(`\nIssues (${result.issues.length}):`);
          for (const issue of result.issues) console.log(`  - ${issue}`);
        }
      },
    );

  cmd
    .command('setup-dev')
    .description('Configure local development environment')
    .option('--domain <domain>', 'Local domain', 'http://localhost:3000')
    .option('--convex-url <url>', 'Convex self-hosted URL', 'http://localhost:3210')
    .option('--convex-site <url>', 'Convex site URL', 'http://localhost:3211')
    .option('--mock-auth', 'Enable mock auth bypass', true)
    .option('--inherit', 'Inherit missing values from production .env', false)
    .option('--yes', 'Skip confirmations', false)
    .option('--dry-run', 'Preview changes without applying', false)
    .action(
      (opts: {
        domain: string;
        convexUrl: string;
        convexSite: string;
        mockAuth: boolean;
        inherit: boolean;
        yes: boolean;
        dryRun: boolean;
      }) => {
        const devFile = readEnvFile(resolveEnvFile('dev'));
        const result = {
          envDevUpdated: false,
          mockAuthConfigured: false,
          inherited: [] as string[],
          issues: [] as string[],
        };

        printHeader('Setup Development Environment');

        // Inherit from prod if requested
        if (opts.inherit) {
          printInfo('Inheriting missing values from production...');
          const { copied, skipped } = inheritEnvValues('dev', 'prod');
          result.inherited = copied;
          if (copied.length > 0) {
            printSuccess(`Inherited ${copied.length} value(s) from prod:`);
            for (const key of copied) console.log(`  + ${key}`);
          }
        }

        // Update .env.development
        printInfo('Step 1: Updating .env.development...');
        setEnvValue(devFile, 'BETTER_AUTH_URL', opts.domain);
        setEnvValue(devFile, 'SITE_URL', opts.domain);
        setEnvValue(devFile, 'VITE_CONVEX_URL', opts.convexUrl);
        setEnvValue(devFile, 'VITE_CONVEX_SITE_URL', opts.convexSite);
        setEnvValue(
          devFile,
          'CONVEX_SELF_HOSTED_URL',
          opts.convexUrl.replace('localhost', 'convex'),
        );
        setEnvValue(devFile, 'NODE_ENV', 'development');

        if (opts.mockAuth) {
          setEnvValue(devFile, 'DEV_AUTH_BYPASS', 'true');
          setEnvValue(devFile, 'DEV_USER_EMAIL', 'dev@example.com');
          setEnvValue(devFile, 'DEV_USER_NAME', 'Dev User');
          setEnvValue(devFile, 'DEV_USER_USERNAME', 'devuser');
          result.mockAuthConfigured = true;
        }

        if (opts.dryRun) {
          printInfo(`[DRY-RUN] Would update .env.development:`);
          console.log(`    BETTER_AUTH_URL=${opts.domain}`);
          console.log(`    SITE_URL=${opts.domain}`);
          console.log(`    VITE_CONVEX_URL=${opts.convexUrl}`);
          console.log(`    VITE_CONVEX_SITE_URL=${opts.convexSite}`);
          console.log(`    DEV_AUTH_BYPASS=${opts.mockAuth}`);
        } else if (opts.yes) {
          backupEnvFile(resolveEnvFile('dev'));
          writeEnvFile(devFile);
          result.envDevUpdated = true;
          printSuccess('Updated .env.development');
        } else {
          printWarning('Use --yes to apply changes');
        }

        // Summary
        printHeader('Setup Summary');
        console.log(`  Dev env updated:    ${result.envDevUpdated ? '✓' : '✗'}`);
        console.log(`  Mock auth:          ${result.mockAuthConfigured ? '✓' : '✗'}`);
        if (result.inherited.length > 0) {
          console.log(`  Inherited from prod: ${result.inherited.length} value(s)`);
        }
        console.log('');
        printInfo('Next steps:');
        console.log('  1. mise run docker:up       # Start Docker services');
        console.log('  2. mise run core:langium    # Generate Langium artifacts');
        console.log('  3. mise run ws:app-dev      # Start the app');
        console.log('  4. Open http://localhost:3000/dev-login');
      },
    );

  return cmd;
}
