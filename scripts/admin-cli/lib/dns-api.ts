import { c, printError, printInfo, printSuccess, printWarning } from './colors.js';

export interface DnsConfig {
  provider: 'cloudflare' | 'route53' | 'manual';
  token?: string;
  zoneId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export async function createDnsRecords(
  config: DnsConfig,
  domain: string,
  target: string,
  dryRun = false,
): Promise<boolean> {
  switch (config.provider) {
    case 'cloudflare':
      return createCloudflareRecord(config, domain, target, dryRun);
    case 'route53':
      printWarning('Route53 automation not yet implemented');
      return false;
    case 'manual':
    default:
      printWarning('DNS provider not configured. Manual instructions:');
      console.log(`  Create a CNAME record: ${domain} -> cname.vercel-dns.com`);
      console.log(`  Or an A record pointing to Vercel's edge network`);
      return false;
  }
}

async function createCloudflareRecord(
  config: DnsConfig,
  domain: string,
  target: string,
  dryRun = false,
): Promise<boolean> {
  if (!config.token || !config.zoneId) {
    printError('Cloudflare requires token and zoneId. Set them with config set-dns-credentials');
    return false;
  }

  if (dryRun) {
    printInfo(`[DRY-RUN] Would create Cloudflare DNS record for ${c.code(domain)} -> ${target}`);
    return true;
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${config.zoneId}/dns_records`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'CNAME',
          name: domain,
          content: target,
          ttl: 1, // Auto
          proxied: false,
        }),
      },
    );
    const data = (await res.json()) as { success: boolean; errors?: Array<{ message: string }> };
    if (data.success) {
      printSuccess(`Created Cloudflare DNS record for ${domain}`);
      return true;
    }
    printError(`Cloudflare API error: ${data.errors?.map((e) => e.message).join(', ')}`);
    return false;
  } catch (err) {
    printError(`Cloudflare API request failed: ${err}`);
    return false;
  }
}

export async function verifyDnsPropagation(
  domain: string,
  expectedTarget?: string,
): Promise<boolean> {
  printInfo(`Checking DNS propagation for ${c.code(domain)}...`);
  try {
    // Use Google's public DNS over HTTPS
    const res = await fetch(`https://dns.google/resolve?name=${domain}&type=CNAME`);
    const data = (await res.json()) as { Answer?: Array<{ data: string }> };
    if (data.Answer && data.Answer.length > 0) {
      const actual = data.Answer[0].data;
      if (expectedTarget && actual !== expectedTarget) {
        printWarning(`DNS points to ${actual}, expected ${expectedTarget}`);
        return false;
      }
      printSuccess(`DNS resolved: ${domain} -> ${actual}`);
      return true;
    }
    printWarning('DNS not yet propagated');
    return false;
  } catch {
    printWarning('Could not verify DNS propagation');
    return false;
  }
}
