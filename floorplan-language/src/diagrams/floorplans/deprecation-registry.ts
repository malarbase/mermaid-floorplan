/**
 * Deprecation registry for tracking feature lifecycle across grammar versions.
 *
 * Deprecation lifecycle:
 * 1. Feature introduced in version X
 * 2. Feature deprecated in version Y (warnings emitted)
 * 3. Feature removed in version Z (errors if used)
 */

import { parseVersion, type SemanticVersion } from './version-resolver.js';

/**
 * Deprecation information for a feature
 */
export interface DeprecationInfo {
  /** Feature name/identifier */
  feature: string;
  /** Human-readable description */
  description: string;
  /** Version when feature was deprecated (warnings start) */
  deprecatedIn: SemanticVersion;
  /** Version when feature will be/was removed (errors) */
  removedIn: SemanticVersion;
  /** Replacement feature/syntax */
  replacement: string;
  /** Migration guidance */
  migrationGuide: string;
}

/**
 * Registry of all deprecated features
 */
export const DEPRECATION_REGISTRY: DeprecationInfo[] = [
  {
    feature: 'door_width',
    description: 'Separate door_width and door_height config properties',
    deprecatedIn: parseVersion('1.1.0'),
    removedIn: parseVersion('2.0.0'),
    replacement: 'door_size',
    migrationGuide: 'Replace `door_width: X` and `door_height: Y` with `door_size: (X x Y)`',
  },
  {
    feature: 'door_height',
    description: 'Separate door_width and door_height config properties',
    deprecatedIn: parseVersion('1.1.0'),
    removedIn: parseVersion('2.0.0'),
    replacement: 'door_size',
    migrationGuide: 'Replace `door_width: X` and `door_height: Y` with `door_size: (X x Y)`',
  },
  {
    feature: 'window_width',
    description: 'Separate window_width and window_height config properties',
    deprecatedIn: parseVersion('1.1.0'),
    removedIn: parseVersion('2.0.0'),
    replacement: 'window_size',
    migrationGuide: 'Replace `window_width: X` and `window_height: Y` with `window_size: (X x Y)`',
  },
  {
    feature: 'window_height',
    description: 'Separate window_width and window_height config properties',
    deprecatedIn: parseVersion('1.1.0'),
    removedIn: parseVersion('2.0.0'),
    replacement: 'window_size',
    migrationGuide: 'Replace `window_width: X` and `window_height: Y` with `window_size: (X x Y)`',
  },
];

/**
 * Check if a feature is deprecated in the given version.
 *
 * @param featureName - Name of the feature to check
 * @param currentVersion - Version being used
 * @returns Deprecation info if deprecated, undefined otherwise
 */
export function isDeprecated(
  featureName: string,
  currentVersion: SemanticVersion,
): DeprecationInfo | undefined {
  const deprecation = DEPRECATION_REGISTRY.find((d) => d.feature === featureName);

  if (!deprecation) {
    return undefined;
  }

  // Feature is deprecated if current version >= deprecation version
  const isInDeprecatedRange = compareVersions(currentVersion, deprecation.deprecatedIn) >= 0;

  return isInDeprecatedRange ? deprecation : undefined;
}

/**
 * Check if a feature is removed (errors) in the given version.
 *
 * @param featureName - Name of the feature to check
 * @param currentVersion - Version being used
 * @returns true if feature is removed
 */
export function isRemoved(featureName: string, currentVersion: SemanticVersion): boolean {
  const deprecation = DEPRECATION_REGISTRY.find((d) => d.feature === featureName);

  if (!deprecation) {
    return false;
  }

  // Feature is removed if current version >= removal version
  return compareVersions(currentVersion, deprecation.removedIn) >= 0;
}

/**
 * Get deprecation warning message for a feature.
 *
 * @param featureName - Name of the deprecated feature
 * @returns Warning message with migration guidance
 */
export function getDeprecationWarning(featureName: string): string | undefined {
  const deprecation = DEPRECATION_REGISTRY.find((d) => d.feature === featureName);

  if (!deprecation) {
    return undefined;
  }

  return (
    `⚠️  Deprecation warning: '${deprecation.feature}' is deprecated since version ${formatVersion(deprecation.deprecatedIn)}.\n` +
    `    ${deprecation.migrationGuide}\n` +
    `    This will become an error in version ${formatVersion(deprecation.removedIn)}.\n` +
    `    Run 'floorplan migrate <file> --to ${formatVersion(deprecation.removedIn)}' to auto-fix.`
  );
}

/**
 * Get removal error message for a feature.
 *
 * @param featureName - Name of the removed feature
 * @returns Error message with migration guidance
 */
export function getRemovalError(featureName: string): string | undefined {
  const deprecation = DEPRECATION_REGISTRY.find((d) => d.feature === featureName);

  if (!deprecation) {
    return undefined;
  }

  return (
    `❌ Error: '${deprecation.feature}' was removed in version ${formatVersion(deprecation.removedIn)}.\n` +
    `    ${deprecation.migrationGuide}\n` +
    `    Use '${deprecation.replacement}' instead.`
  );
}

/**
 * Get all deprecations applicable to a version.
 *
 * @param version - Version to check
 * @returns List of active deprecations
 */
export function getActiveDeprecations(version: SemanticVersion): DeprecationInfo[] {
  return DEPRECATION_REGISTRY.filter((d) => {
    const isDeprecated = compareVersions(version, d.deprecatedIn) >= 0;
    const isNotYetRemoved = compareVersions(version, d.removedIn) < 0;
    return isDeprecated && isNotYetRemoved;
  });
}

/**
 * Get all features removed in a version.
 *
 * @param version - Version to check
 * @returns List of removed features
 */
export function getRemovedFeatures(version: SemanticVersion): DeprecationInfo[] {
  return DEPRECATION_REGISTRY.filter((d) => compareVersions(version, d.removedIn) >= 0);
}

// Helper function for version comparison
function compareVersions(v1: SemanticVersion, v2: SemanticVersion): number {
  if (v1.major !== v2.major) {
    return v1.major - v2.major;
  }
  if (v1.minor !== v2.minor) {
    return v1.minor - v2.minor;
  }
  return v1.patch - v2.patch;
}

// Helper function for version formatting
function formatVersion(version: SemanticVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}
