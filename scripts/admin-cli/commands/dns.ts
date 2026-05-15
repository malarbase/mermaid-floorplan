import { Command } from 'commander';
import {
  c,
  printError,
  printHeader,
  printInfo,
  printSuccess,
  printWarning,
} from '../lib/colors.js';
import { promptConfirm } from '../lib/prompts.js';
import { isValidDomain } from '../lib/validators.js';

export function createDnsCommand(): Command {
  const cmd = new Command('dns').description('DNS setup wizard');

  cmd
    .command('setup <domain>')
    .description('Interactive DNS setup wizard')
    .action(async (domain: string) => {
      if (!isValidDomain(domain)) {
        printError(`Invalid domain: ${domain}`);
        process.exit(1);
      }

      printHeader(`DNS Setup: ${domain}`);
      printInfo(`Domain: ${c.code(domain)}`);

      const updateEnv = await promptConfirm('Update .env.production with this domain?');
      if (updateEnv) {
        printInfo('Run: npx tsx scripts/admin-cli.ts config set-domain ' + domain);
      }

      const updateConvex = await promptConfirm('Sync domain to Convex env vars?');
      if (updateConvex) {
        printInfo(
          'Run: npx tsx scripts/admin-cli.ts env sync-to-convex --vars SITE_URL,ALLOWED_ORIGINS',
        );
      }

      console.log('\n' + c.bold('Google Cloud Console Instructions:'));
      console.log(`  Authorized JavaScript origins: https://${domain}`);
      console.log(`  Authorized redirect URIs:      https://${domain}/api/auth/callback/google`);

      console.log('\n' + c.bold('Vercel Dashboard Instructions:'));
      console.log(`  Add custom domain: ${domain}`);

      const verifyNow = await promptConfirm('Verify DNS now?');
      if (verifyNow) {
        printInfo('Run: npx tsx scripts/admin-cli.ts dns verify ' + domain);
      }
    });

  cmd
    .command('verify <domain>')
    .description('Verify DNS records')
    .action((domain: string) => {
      printHeader(`DNS Verification: ${domain}`);
      printWarning(
        'DNS verification requires the `dns2` package. Install it to enable this feature.',
      );
      printInfo(`Expected A record: ${domain} -> Vercel IP`);
    });

  return cmd;
}
