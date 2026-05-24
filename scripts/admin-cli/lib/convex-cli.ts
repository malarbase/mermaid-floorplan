import { execSync } from 'node:child_process';

export interface ConvexCliOptions {
  url?: string;
  adminKey?: string;
}

export function convexEnvSet(key: string, value: string, options: ConvexCliOptions = {}): void {
  const args = ['convex', 'env', 'set', key, value];
  if (options.url) args.push('--url', options.url);
  if (options.adminKey) args.push('--admin-key', options.adminKey);
  execSync(`npx ${args.map((a) => `"${a}"`).join(' ')}`, { stdio: 'inherit' });
}

export function convexEnvList(options: ConvexCliOptions = {}): Record<string, string> {
  const args = ['convex', 'env', 'list'];
  if (options.url) args.push('--url', options.url);
  const output = execSync(`npx ${args.map((a) => `"${a}"`).join(' ')}`, { encoding: 'utf-8' });
  const result: Record<string, string> = {};
  for (const line of output.split('\n')) {
    const match = line.match(/^(.+?)\s*=\s*(.+)$/);
    if (match) result[match[1].trim()] = match[2].trim();
  }
  return result;
}

export function convexRun(functionName: string, options: ConvexCliOptions = {}): void {
  const args = ['convex', 'run', functionName];
  if (options.url) args.push('--url', options.url);
  if (options.adminKey) args.push('--admin-key', options.adminKey);
  execSync(`npx ${args.map((a) => `"${a}"`).join(' ')}`, { stdio: 'inherit' });
}
