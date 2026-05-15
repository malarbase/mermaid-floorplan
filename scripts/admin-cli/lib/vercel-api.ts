import { c, printError, printInfo, printSuccess, printWarning } from './colors.js';

export interface VercelConfig {
  token: string;
  teamId?: string;
  projectId?: string;
}

function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function addVercelDomain(
  config: VercelConfig,
  domain: string,
  dryRun = false,
): Promise<boolean> {
  const projectId = config.projectId || (await detectProjectId(config));
  if (!projectId) {
    printError('Could not detect Vercel project ID. Set it with --vercel-project-id or in .env');
    return false;
  }

  const url = `https://api.vercel.com/v10/projects/${projectId}/domains${config.teamId ? `?teamId=${config.teamId}` : ''}`;

  if (dryRun) {
    printInfo(`[DRY-RUN] Would add domain ${c.code(domain)} to Vercel project ${projectId}`);
    return true;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: getHeaders(config.token),
      body: JSON.stringify({ name: domain }),
    });
    if (res.ok || res.status === 409) {
      printSuccess(`Domain ${domain} added to Vercel project`);
      return true;
    }
    const body = await res.text();
    printError(`Vercel API error: ${res.status} ${body}`);
    return false;
  } catch (err) {
    printError(`Vercel API request failed: ${err}`);
    return false;
  }
}

export async function setVercelEnvVar(
  config: VercelConfig,
  key: string,
  value: string,
  dryRun = false,
): Promise<boolean> {
  const projectId = config.projectId || (await detectProjectId(config));
  if (!projectId) {
    printError('Could not detect Vercel project ID');
    return false;
  }

  const url = `https://api.vercel.com/v10/projects/${projectId}/env${config.teamId ? `?teamId=${config.teamId}` : ''}`;

  if (dryRun) {
    printInfo(`[DRY-RUN] Would set Vercel env var ${c.code(key)}`);
    return true;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: getHeaders(config.token),
      body: JSON.stringify({
        key,
        value,
        type: 'encrypted',
        target: ['production'],
      }),
    });
    if (res.ok) {
      printSuccess(`Set Vercel env var ${key}`);
      return true;
    }
    const body = await res.text();
    printError(`Vercel API error: ${res.status} ${body}`);
    return false;
  } catch (err) {
    printError(`Vercel API request failed: ${err}`);
    return false;
  }
}

export async function redeployVercel(config: VercelConfig, dryRun = false): Promise<boolean> {
  if (dryRun) {
    printInfo('[DRY-RUN] Would trigger Vercel redeploy');
    return true;
  }
  printInfo(
    'Triggering Vercel redeploy... (not yet implemented - use Vercel dashboard or git push)',
  );
  return true;
}

async function detectProjectId(config: VercelConfig): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://api.vercel.com/v9/projects${config.teamId ? `?teamId=${config.teamId}` : ''}`,
      {
        headers: getHeaders(config.token),
      },
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as { projects: Array<{ name: string; id: string }> };
    // Try to find a project matching floorplan-app
    return data.projects.find((p) => p.name.includes('floorplan'))?.id;
  } catch {
    return undefined;
  }
}
