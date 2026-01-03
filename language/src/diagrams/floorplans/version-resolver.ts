/**
 * Grammar versioning utilities for the floorplan DSL.
 * Handles version parsing, comparison, and compatibility checks.
 */

import { Floorplan } from '../../generated/ast.js';

/**
 * Current grammar version (semantic versioning: MAJOR.MINOR.PATCH)
 */
export const CURRENT_VERSION = '1.0.0';

/**
 * Parsed semantic version structure
 */
export interface SemanticVersion {
    major: number;
    minor: number;
    patch: number;
    raw: string;
}

/**
 * Parse a version string into semantic version components.
 * Supports formats: "1.0", "1.0.0", 1.0, 1.0.0
 *
 * @param versionStr - Version string (with or without quotes)
 * @returns Parsed semantic version
 */
export function parseVersion(versionStr: string): SemanticVersion {
    // Remove quotes if present
    let version = versionStr.replace(/^["']|["']$/g, '');

    const parts = version.split('.');

    if (parts.length < 2 || parts.length > 3) {
        throw new Error(`Invalid version format: ${versionStr}. Expected format: X.Y or X.Y.Z`);
    }

    const major = parseInt(parts[0], 10);
    const minor = parseInt(parts[1], 10);
    const patch = parts.length === 3 ? parseInt(parts[2], 10) : 0;

    if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
        throw new Error(`Invalid version format: ${versionStr}. Version parts must be numbers.`);
    }

    return {
        major,
        minor,
        patch,
        raw: version
    };
}

/**
 * Compare two semantic versions.
 *
 * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(v1: SemanticVersion, v2: SemanticVersion): number {
    if (v1.major !== v2.major) {
        return v1.major < v2.major ? -1 : 1;
    }
    if (v1.minor !== v2.minor) {
        return v1.minor < v2.minor ? -1 : 1;
    }
    if (v1.patch !== v2.patch) {
        return v1.patch < v2.patch ? -1 : 1;
    }
    return 0;
}

/**
 * Check if version is compatible with current grammar.
 *
 * Rules:
 * - Same major version: Compatible (may have deprecation warnings)
 * - Different major version: Incompatible
 *
 * @param version - Version to check
 * @returns true if compatible
 */
export function isCompatibleVersion(version: SemanticVersion): boolean {
    const current = parseVersion(CURRENT_VERSION);
    return version.major === current.major;
}

/**
 * Check if version is newer than current.
 *
 * @param version - Version to check
 * @returns true if version is from the future
 */
export function isFutureVersion(version: SemanticVersion): boolean {
    const current = parseVersion(CURRENT_VERSION);
    return compareVersions(version, current) > 0;
}

/**
 * Extract version from floorplan AST.
 * Priority: versionDirective > frontmatter.version
 *
 * @param floorplan - Parsed floorplan AST
 * @returns Extracted version string or undefined
 */
export function extractVersionFromAST(floorplan: Floorplan): string | undefined {
    // Helper to strip quotes from version strings
    const stripQuotes = (str: string): string => {
        return str.replace(/^["']|["']$/g, '');
    };

    // Check inline directive first
    if (floorplan.versionDirective) {
        if (floorplan.versionDirective.version) {
            return stripQuotes(floorplan.versionDirective.version);
        }
        if (floorplan.versionDirective.versionNumber !== undefined) {
            // Convert NUMBER to version string (e.g., 1 -> "1.0", 1.5 -> "1.5")
            const num = floorplan.versionDirective.versionNumber;
            // If it's a whole number, append .0
            return Number.isInteger(num) ? `${num}.0` : num.toString();
        }
    }

    // Check frontmatter
    if (floorplan.frontmatter?.properties) {
        const versionProp = floorplan.frontmatter.properties.find(
            prop => prop.key === 'version'
        );

        if (versionProp?.value) {
            // Try different value types
            if (versionProp.value.versionValue) {
                return stripQuotes(versionProp.value.versionValue);
            }
            if (versionProp.value.stringValue) {
                return stripQuotes(versionProp.value.stringValue);
            }
            if (versionProp.value.numberValue !== undefined) {
                return versionProp.value.numberValue.toString();
            }
        }
    }

    return undefined;
}

/**
 * Resolve and validate version from floorplan AST.
 *
 * @param floorplan - Parsed floorplan AST
 * @returns Object with version info and warnings/errors
 */
export function resolveVersion(floorplan: Floorplan): {
    version: SemanticVersion;
    warnings: string[];
    errors: string[];
} {
    const warnings: string[] = [];
    const errors: string[] = [];

    const versionStr = extractVersionFromAST(floorplan);

    // No version declared - use current with warning
    if (!versionStr) {
        warnings.push(
            `No grammar version declared. Assuming version ${CURRENT_VERSION}. ` +
            `Add '%%{version: ${CURRENT_VERSION}}%%' or YAML frontmatter with 'version: "${CURRENT_VERSION}"' ` +
            `to suppress this warning.`
        );
        return {
            version: parseVersion(CURRENT_VERSION),
            warnings,
            errors
        };
    }

    // Parse version
    let version: SemanticVersion;
    try {
        version = parseVersion(versionStr);
    } catch (err) {
        errors.push(`Invalid version format: ${versionStr}. ${err instanceof Error ? err.message : String(err)}`);
        // Return current version as fallback
        return {
            version: parseVersion(CURRENT_VERSION),
            warnings,
            errors
        };
    }

    // Check for future version
    if (isFutureVersion(version)) {
        errors.push(
            `Unsupported grammar version: ${version.raw}. ` +
            `This parser supports up to version ${CURRENT_VERSION}. ` +
            `Please upgrade your parser or use an older grammar version.`
        );
        return { version, warnings, errors };
    }

    // Check for incompatible version (different major)
    if (!isCompatibleVersion(version)) {
        const current = parseVersion(CURRENT_VERSION);
        if (version.major < current.major) {
            warnings.push(
                `Using legacy grammar version ${version.raw}. Current version is ${CURRENT_VERSION}. ` +
                `Consider running 'floorplan migrate <file> --to ${CURRENT_VERSION}' to upgrade.`
            );
        }
    }

    return { version, warnings, errors };
}

/**
 * Format semantic version as string.
 */
export function formatVersion(version: SemanticVersion): string {
    return `${version.major}.${version.minor}.${version.patch}`;
}
