/**
 * Migration system for floorplan DSL.
 * Provides automated transformations for upgrading between grammar versions.
 */

import { SemanticVersion, parseVersion } from './version-resolver.js';

/**
 * Migration result containing the transformed content and any messages
 */
export interface MigrationResult {
    /** Migrated floorplan content */
    content: string;
    /** Success status */
    success: boolean;
    /** Migration warnings (non-blocking) */
    warnings: string[];
    /** Migration errors (blocking) */
    errors: string[];
    /** Changes applied during migration */
    changes: string[];
}

/**
 * A migration step from one version to another
 */
export interface MigrationStep {
    fromVersion: SemanticVersion;
    toVersion: SemanticVersion;
    description: string;
    /**
     * Apply this migration step to the floorplan content
     * @returns Migrated content or throws error
     */
    migrate(content: string): string;
}

/**
 * Registry of all available migration steps
 */
const MIGRATION_REGISTRY: MigrationStep[] = [
    {
        fromVersion: parseVersion('1.0.0'),
        toVersion: parseVersion('2.0.0'),
        description: 'Migrate door_width/door_height to door_size, window_width/window_height to window_size',
        migrate(content: string): string {
            let migrated = content;
            const changes: string[] = [];

            // Match config blocks and transform deprecated properties
            // This regex finds config blocks and processes them
            const configRegex = /config\s*\{([^}]+)\}/gs;

            migrated = migrated.replace(configRegex, (match, configContent) => {
                let newConfigContent = configContent;

                // Track door width and height to combine
                let doorWidth: string | null = null;
                let doorHeight: string | null = null;
                let doorWidthMatch: string | null = null;
                let doorHeightMatch: string | null = null;

                // Track window width and height to combine
                let windowWidth: string | null = null;
                let windowHeight: string | null = null;
                let windowWidthMatch: string | null = null;
                let windowHeightMatch: string | null = null;

                // Find door_width and door_height
                const doorWidthRegex = /door_width\s*:\s*([0-9.]+(?:\s*[a-z]+)?)/gi;
                const doorHeightRegex = /door_height\s*:\s*([0-9.]+(?:\s*[a-z]+)?)/gi;

                const dw = doorWidthRegex.exec(newConfigContent);
                if (dw) {
                    doorWidth = dw[1].trim();
                    doorWidthMatch = dw[0];
                }

                const dh = doorHeightRegex.exec(newConfigContent);
                if (dh) {
                    doorHeight = dh[1].trim();
                    doorHeightMatch = dh[0];
                }

                // Find window_width and window_height
                const windowWidthRegex = /window_width\s*:\s*([0-9.]+(?:\s*[a-z]+)?)/gi;
                const windowHeightRegex = /window_height\s*:\s*([0-9.]+(?:\s*[a-z]+)?)/gi;

                const ww = windowWidthRegex.exec(newConfigContent);
                if (ww) {
                    windowWidth = ww[1].trim();
                    windowWidthMatch = ww[0];
                }

                const wh = windowHeightRegex.exec(newConfigContent);
                if (wh) {
                    windowHeight = wh[1].trim();
                    windowHeightMatch = wh[0];
                }

                // Replace door_width and door_height with door_size
                if (doorWidth && doorHeight && doorWidthMatch && doorHeightMatch) {
                    // Remove both old properties
                    newConfigContent = newConfigContent.replace(doorWidthMatch, '');
                    newConfigContent = newConfigContent.replace(doorHeightMatch, '');

                    // Add new door_size property
                    const doorSize = `door_size: (${doorWidth} x ${doorHeight})`;
                    newConfigContent = newConfigContent + `, ${doorSize}`;
                    changes.push(`Migrated door_width and door_height to door_size: (${doorWidth} x ${doorHeight})`);
                } else if (doorWidth || doorHeight) {
                    // Only one is present - still migrate but warn
                    if (doorWidth && doorWidthMatch) {
                        newConfigContent = newConfigContent.replace(doorWidthMatch, '');
                        const defaultHeight = '7ft'; // reasonable default
                        newConfigContent = newConfigContent + `, door_size: (${doorWidth} x ${defaultHeight})`;
                        changes.push(`Migrated door_width to door_size (used default height: ${defaultHeight})`);
                    }
                    if (doorHeight && doorHeightMatch) {
                        newConfigContent = newConfigContent.replace(doorHeightMatch, '');
                        const defaultWidth = '3ft'; // reasonable default
                        newConfigContent = newConfigContent + `, door_size: (${defaultWidth} x ${doorHeight})`;
                        changes.push(`Migrated door_height to door_size (used default width: ${defaultWidth})`);
                    }
                }

                // Replace window_width and window_height with window_size
                if (windowWidth && windowHeight && windowWidthMatch && windowHeightMatch) {
                    // Remove both old properties
                    newConfigContent = newConfigContent.replace(windowWidthMatch, '');
                    newConfigContent = newConfigContent.replace(windowHeightMatch, '');

                    // Add new window_size property
                    const windowSize = `window_size: (${windowWidth} x ${windowHeight})`;
                    newConfigContent = newConfigContent + `, ${windowSize}`;
                    changes.push(`Migrated window_width and window_height to window_size: (${windowWidth} x ${windowHeight})`);
                } else if (windowWidth || windowHeight) {
                    // Only one is present - still migrate but warn
                    if (windowWidth && windowWidthMatch) {
                        newConfigContent = newConfigContent.replace(windowWidthMatch, '');
                        const defaultHeight = '4ft'; // reasonable default
                        newConfigContent = newConfigContent + `, window_size: (${windowWidth} x ${defaultHeight})`;
                        changes.push(`Migrated window_width to window_size (used default height: ${defaultHeight})`);
                    }
                    if (windowHeight && windowHeightMatch) {
                        newConfigContent = newConfigContent.replace(windowHeightMatch, '');
                        const defaultWidth = '3ft'; // reasonable default
                        newConfigContent = newConfigContent + `, window_size: (${defaultWidth} x ${windowHeight})`;
                        changes.push(`Migrated window_height to window_size (used default width: ${defaultWidth})`);
                    }
                }

                // Clean up multiple commas and whitespace
                newConfigContent = newConfigContent.replace(/,\s*,/g, ',');
                newConfigContent = newConfigContent.replace(/,\s*}/g, ' }');

                return `config {${newConfigContent}}`;
            });

            // Update version directive if present
            migrated = updateVersionInContent(migrated, '2.0.0');

            return migrated;
        }
    }
];

/**
 * Find migration path between two versions
 */
function findMigrationPath(from: SemanticVersion, to: SemanticVersion): MigrationStep[] {
    const path: MigrationStep[] = [];

    // For now, simple approach: find all steps from "from" version to "to" version
    for (const step of MIGRATION_REGISTRY) {
        // Check if this step is part of the path
        if (compareVersions(step.fromVersion, from) >= 0 &&
            compareVersions(step.toVersion, to) <= 0) {
            path.push(step);
        }
    }

    // Sort by version
    path.sort((a, b) => compareVersions(a.fromVersion, b.fromVersion));

    return path;
}

/**
 * Migrate floorplan content from one version to another
 */
export function migrate(
    content: string,
    targetVersion: string | SemanticVersion,
    dryRun: boolean = false
): MigrationResult {
    const result: MigrationResult = {
        content,
        success: false,
        warnings: [],
        errors: [],
        changes: []
    };

    try {
        // Parse target version
        const target = typeof targetVersion === 'string'
            ? parseVersion(targetVersion)
            : targetVersion;

        // Extract current version from content
        const currentVersionStr = extractVersionFromContent(content);
        const current = currentVersionStr
            ? parseVersion(currentVersionStr)
            : parseVersion('1.0.0'); // Assume 1.0.0 if no version

        // Check if migration is needed
        if (compareVersions(current, target) === 0) {
            result.warnings.push(`Already at version ${formatVersion(target)}, no migration needed.`);
            result.success = true;
            return result;
        }

        if (compareVersions(current, target) > 0) {
            result.errors.push(`Cannot downgrade from ${formatVersion(current)} to ${formatVersion(target)}.`);
            return result;
        }

        // Find migration path
        const migrationPath = findMigrationPath(current, target);

        if (migrationPath.length === 0) {
            result.errors.push(`No migration path found from ${formatVersion(current)} to ${formatVersion(target)}.`);
            return result;
        }

        // Apply migrations
        let migrated = content;
        for (const step of migrationPath) {
            result.changes.push(`Applying: ${step.description}`);
            migrated = step.migrate(migrated);
        }

        // If dry run, don't return migrated content
        if (dryRun) {
            result.warnings.push('Dry run mode - no changes applied');
        } else {
            result.content = migrated;
        }

        result.success = true;

    } catch (err) {
        result.errors.push(`Migration failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    return result;
}

/**
 * Extract version string from floorplan content (textual parsing)
 */
function extractVersionFromContent(content: string): string | null {
    // Check for inline directive
    const inlineMatch = content.match(/%%\{\s*version\s*:\s*([0-9.]+)\s*\}%%/);
    if (inlineMatch) {
        return inlineMatch[1];
    }

    // Check for frontmatter
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
        const yamlContent = frontmatterMatch[1];
        const versionMatch = yamlContent.match(/version\s*:\s*["']?([0-9.]+)["']?/);
        if (versionMatch) {
            return versionMatch[1];
        }
    }

    return null;
}

/**
 * Update version in content (textual replacement)
 */
function updateVersionInContent(content: string, newVersion: string): string {
    // Update inline directive
    content = content.replace(
        /%%\{\s*version\s*:\s*[0-9.]+\s*\}%%/,
        `%%{version: ${newVersion}}%%`
    );

    // Update frontmatter
    content = content.replace(
        /^(---\s*\n[\s\S]*?)version\s*:\s*["']?[0-9.]+["']?/m,
        `$1version: "${newVersion}"`
    );

    // If no version was found, add inline directive
    if (!content.match(/%%\{\s*version\s*:\s*[0-9.]+\s*\}%%/) &&
        !content.match(/^---\s*\n[\s\S]*?version\s*:/m)) {
        // Add inline directive before "floorplan" keyword
        content = content.replace(/^(\s*)floorplan/m, `$1%%{version: ${newVersion}}%%\nfloorplan`);
    }

    return content;
}

// Helper functions
function compareVersions(v1: SemanticVersion, v2: SemanticVersion): number {
    if (v1.major !== v2.major) {
        return v1.major - v2.major;
    }
    if (v1.minor !== v2.minor) {
        return v1.minor - v2.minor;
    }
    return v1.patch - v2.patch;
}

function formatVersion(version: SemanticVersion): string {
    return `${version.major}.${version.minor}.${version.patch}`;
}
