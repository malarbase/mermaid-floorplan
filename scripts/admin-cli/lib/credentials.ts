import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Entry } from '@napi-rs/keyring';
import type { ApiCredentials } from '../types.js';
import { printWarning } from './colors.js';

const CREDENTIALS_PATH = resolve(process.cwd(), '.admin-cli.json');
const KEYRING_SERVICE = 'floorplan-app/admin-cli';

/** Credentials that should be stored in the OS keyring for security */
const SENSITIVE_KEYS: Array<keyof ApiCredentials> = [
  'vercelToken',
  'dnsToken',
  'googleServiceAccountPath',
];

function getKeyringEntry(key: string): Entry {
  return new Entry(KEYRING_SERVICE, key);
}

function isSensitiveKey(key: string): key is (typeof SENSITIVE_KEYS)[number] {
  return SENSITIVE_KEYS.includes(key as (typeof SENSITIVE_KEYS)[number]);
}

function keyringSet(key: string, value: string): void {
  const entry = getKeyringEntry(key);
  entry.setPassword(value);
}

function keyringGet(key: string): string | null {
  try {
    const entry = getKeyringEntry(key);
    return entry.getPassword();
  } catch {
    return null;
  }
}

function keyringDelete(key: string): boolean {
  try {
    const entry = getKeyringEntry(key);
    return entry.deletePassword();
  } catch {
    return false;
  }
}

function loadFileCredentials(): ApiCredentials {
  if (!existsSync(CREDENTIALS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8')) as ApiCredentials;
  } catch {
    return {};
  }
}

function saveFileCredentials(creds: ApiCredentials): void {
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(creds, null, 2) + '\n');
}

/**
 * Load credentials from OS keyring (preferred) with fallback to .admin-cli.json.
 * Sensitive tokens are read from the keyring; non-sensitive metadata from the file.
 */
export function loadCredentials(): ApiCredentials {
  const fileCreds = loadFileCredentials();
  const result: ApiCredentials = {};

  // Load non-sensitive metadata from file
  for (const key of Object.keys(fileCreds) as Array<keyof ApiCredentials>) {
    if (!isSensitiveKey(key)) {
      result[key] = fileCreds[key];
    }
  }

  // Load sensitive credentials from keyring with fallback to file
  for (const key of SENSITIVE_KEYS) {
    const keyringValue = keyringGet(key);
    if (keyringValue !== null) {
      (result as Record<string, string>)[key] = keyringValue;
    } else if (fileCreds[key]) {
      // Fallback: credential still in file (not yet migrated)
      (result as Record<string, string>)[key] = fileCreds[key] as string;
    }
  }

  return result;
}

/**
 * Save a credential. Sensitive values go to the OS keyring;
 * non-sensitive values go to .admin-cli.json.
 */
export function setCredential<K extends keyof ApiCredentials>(
  key: K,
  value: ApiCredentials[K],
): void {
  if (value === undefined) return;

  if (isSensitiveKey(key)) {
    try {
      keyringSet(key, value as string);
    } catch (err) {
      printWarning(`Keyring unavailable, falling back to file storage for ${key}: ${err}`);
      // Fallback: save to file
      const fileCreds = loadFileCredentials();
      fileCreds[key] = value;
      saveFileCredentials(fileCreds);
    }
    // Also remove from file if it was there (migration cleanup)
    const fileCreds = loadFileCredentials();
    if (fileCreds[key] !== undefined) {
      delete fileCreds[key];
      saveFileCredentials(fileCreds);
    }
  } else {
    const fileCreds = loadFileCredentials();
    (fileCreds as Record<string, unknown>)[key] = value;
    saveFileCredentials(fileCreds);
  }
}

/**
 * Remove a credential from both the keyring and the file.
 */
export function deleteCredential<K extends keyof ApiCredentials>(key: K): void {
  if (isSensitiveKey(key)) {
    keyringDelete(key as string);
  }
  const fileCreds = loadFileCredentials();
  if (fileCreds[key] !== undefined) {
    delete fileCreds[key];
    saveFileCredentials(fileCreds);
  }
}

/**
 * Check if the OS keyring is available and working.
 */
export function isKeyringAvailable(): boolean {
  try {
    const testEntry = new Entry(KEYRING_SERVICE, '__test__');
    testEntry.setPassword('test');
    const result = testEntry.getPassword();
    testEntry.deletePassword();
    return result === 'test';
  } catch {
    return false;
  }
}

/**
 * Migrate sensitive credentials from .admin-cli.json to the OS keyring.
 * Returns the list of keys migrated.
 */
export function migrateCredentialsToKeyring(): string[] {
  const fileCreds = loadFileCredentials();
  const migrated: string[] = [];

  for (const key of SENSITIVE_KEYS) {
    const value = fileCreds[key];
    if (value !== undefined) {
      try {
        keyringSet(key, value as string);
        delete fileCreds[key];
        migrated.push(key);
      } catch (err) {
        printWarning(`Failed to migrate ${key} to keyring: ${err}`);
      }
    }
  }

  if (migrated.length > 0) {
    saveFileCredentials(fileCreds);
  }

  return migrated;
}

/**
 * Clear all stored credentials from both the keyring and .admin-cli.json.
 */
export function clearAllCredentials(): void {
  // Delete sensitive credentials from keyring
  for (const key of SENSITIVE_KEYS) {
    keyringDelete(key);
  }

  // Delete the entire .admin-cli.json file
  if (existsSync(CREDENTIALS_PATH)) {
    writeFileSync(CREDENTIALS_PATH, '{}\n');
  }
}
