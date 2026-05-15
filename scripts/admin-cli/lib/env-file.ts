import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const APP_DIR = resolve(process.cwd(), 'floorplan-app');

export interface EnvEntry {
  key: string;
  value: string;
  comment?: string;
  raw: string;
}

export interface EnvFile {
  path: string;
  entries: EnvEntry[];
}

export type EnvMode = 'prod' | 'dev' | 'shared';

/**
 * Resolve the file path for a given environment mode.
 *   prod    → .env.production
 *   dev     → .env.development
 *   shared  → .env
 */
export function resolveEnvFile(mode: EnvMode): string {
  switch (mode) {
    case 'dev':
      return resolve(APP_DIR, '.env.development');
    case 'shared':
      return resolve(APP_DIR, '.env');
    case 'prod':
    default:
      return resolve(APP_DIR, '.env.production');
  }
}

export function readEnvFile(path: string): EnvFile {
  if (!existsSync(path)) {
    return { path, entries: [] };
  }

  const content = readFileSync(path, 'utf-8');
  const lines = content.split('\n');
  const entries: EnvEntry[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      entries.push({ key: '', value: '', comment: trimmed, raw: line });
    } else if (trimmed.includes('=')) {
      const eqIndex = trimmed.indexOf('=');
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      // Remove surrounding quotes if present
      const unquoted = value.replace(/^["']|["']$/g, '');
      entries.push({ key, value: unquoted, raw: line });
    } else if (trimmed === '') {
      entries.push({ key: '', value: '', raw: line });
    }
  }

  return { path, entries };
}

export function setEnvValue(file: EnvFile, key: string, value: string): void {
  const existing = file.entries.find((e) => e.key === key);
  if (existing) {
    existing.value = value;
    existing.raw = `${key}=${value}`;
  } else {
    file.entries.push({ key, value, raw: `${key}=${value}` });
  }
}

export function getEnvValue(file: EnvFile, key: string): string | undefined {
  return file.entries.find((e) => e.key === key)?.value;
}

export function writeEnvFile(file: EnvFile): void {
  const lines = file.entries.map((e) => e.raw);
  writeFileSync(file.path, lines.join('\n') + '\n');
}

export function backupEnvFile(path: string): void {
  if (existsSync(path)) {
    const backupPath = `${path}.bak`;
    writeFileSync(backupPath, readFileSync(path, 'utf-8'));
  }
}

/**
 * Get a value with inheritance across env files.
 * Priority: .env.local > .env.{mode} > .env (shared)
 */
export function getEnvValueWithInheritance(
  mode: EnvMode,
  key: string,
  localPath?: string,
): string | undefined {
  const files: EnvFile[] = [];

  // 1. Shared base (.env)
  files.push(readEnvFile(resolveEnvFile('shared')));

  // 2. Mode-specific (.env.development or .env.production)
  if (mode !== 'shared') {
    files.push(readEnvFile(resolveEnvFile(mode)));
  }

  // 3. Local overrides (.env.local)
  if (localPath && existsSync(localPath)) {
    files.push(readEnvFile(localPath));
  } else {
    const defaultLocal = resolve(APP_DIR, '.env.local');
    if (existsSync(defaultLocal)) {
      files.push(readEnvFile(defaultLocal));
    }
  }

  // Search in reverse priority order (highest priority last)
  for (let i = files.length - 1; i >= 0; i--) {
    const val = getEnvValue(files[i], key);
    if (val !== undefined) return val;
  }
  return undefined;
}

/**
 * Copy missing keys from source mode to target mode.
 * Only copies keys that don't already exist in the target.
 */
export function inheritEnvValues(
  targetMode: EnvMode,
  sourceMode: EnvMode,
  keys?: string[],
): { copied: string[]; skipped: string[] } {
  const targetPath = resolveEnvFile(targetMode);
  const sourcePath = resolveEnvFile(sourceMode);
  const targetFile = readEnvFile(targetPath);
  const sourceFile = readEnvFile(sourcePath);

  const copied: string[] = [];
  const skipped: string[] = [];

  const keysToCopy = keys ?? sourceFile.entries.filter((e) => e.key).map((e) => e.key);

  for (const key of keysToCopy) {
    const sourceVal = getEnvValue(sourceFile, key);
    const targetVal = getEnvValue(targetFile, key);

    if (sourceVal === undefined) {
      // Key doesn't exist in source — nothing to inherit
      continue;
    }

    if (targetVal === undefined) {
      // Key missing in target — copy from source
      setEnvValue(targetFile, key, sourceVal);
      copied.push(key);
    } else {
      // Key already exists in target — skip
      skipped.push(key);
    }
  }

  if (copied.length > 0) {
    backupEnvFile(targetPath);
    writeEnvFile(targetFile);
  }

  return { copied, skipped };
}
