/**
 * YAML Frontmatter Parser for Floorplan DSL
 *
 * Supports Mermaid.js v10.5.0+ frontmatter syntax:
 * ---
 * title: My Diagram
 * config:
 *   theme: dark
 *   wallThickness: 0.3
 * ---
 * floorplan
 *   ...
 */

import { normalizeConfigKey } from './styles.js';

/**
 * Parsed frontmatter result
 */
export interface FrontmatterResult {
  /** Title from frontmatter */
  title?: string;
  /** Config values from frontmatter (keys normalized to camelCase) */
  config: Record<string, unknown>;
  /** The DSL content without the frontmatter */
  content: string;
  /** Whether frontmatter was found */
  hasFrontmatter: boolean;
}

/**
 * Regex to detect YAML frontmatter at start of document
 * Matches: ---\n<yaml content>\n---
 */
const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n?/;

/**
 * Simple YAML parser for frontmatter
 * Only supports flat key-value pairs and one level of nesting
 * Full YAML parsing would require a dependency like js-yaml
 */
function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split('\n');

  let currentObject: Record<string, unknown> | null = null;

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || line.trim() === '') continue;

    // Check indentation
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;

    // Parse key: value
    const kvMatch = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!kvMatch) continue;

    const [, , key, rawValue] = kvMatch;
    const value = rawValue.trim();

    if (indent === 0) {
      // Top-level key
      if (value === '' || value === '{}') {
        // Start of nested object
        currentObject = {};
        result[key] = currentObject;
      } else {
        // Simple value
        result[key] = parseYamlValue(value);
        currentObject = null;
      }
    } else if (indent > 0 && currentObject !== null) {
      // Nested key
      currentObject[key] = parseYamlValue(value);
    }
  }

  return result;
}

/**
 * Parse a YAML value (string, number, boolean)
 */
function parseYamlValue(value: string): unknown {
  // Remove surrounding quotes
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Number
  const num = Number(value);
  if (!Number.isNaN(num) && value !== '') return num;

  // String (unquoted)
  return value;
}

/**
 * Normalize config keys from frontmatter to camelCase
 */
function normalizeConfigObject(obj: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = normalizeConfigKey(key);
    normalized[normalizedKey] = value;
  }

  return normalized;
}

/**
 * Extract and parse YAML frontmatter from DSL content
 *
 * @param input - Full DSL input including potential frontmatter
 * @returns Parsed frontmatter result
 */
export function parseFrontmatter(input: string): FrontmatterResult {
  const match = input.match(FRONTMATTER_REGEX);

  if (!match) {
    return {
      config: {},
      content: input,
      hasFrontmatter: false,
    };
  }

  const yamlContent = match[1];
  const dslContent = input.slice(match[0].length);

  try {
    const parsed = parseSimpleYaml(yamlContent);

    // Extract title
    const title = typeof parsed.title === 'string' ? parsed.title : undefined;

    // Extract and normalize config
    let config: Record<string, unknown> = {};
    if (parsed.config && typeof parsed.config === 'object') {
      config = normalizeConfigObject(parsed.config as Record<string, unknown>);
    }

    return {
      title,
      config,
      content: dslContent,
      hasFrontmatter: true,
    };
  } catch {
    // If YAML parsing fails, return content without frontmatter
    return {
      config: {},
      content: input,
      hasFrontmatter: false,
    };
  }
}

/**
 * Check if input has YAML frontmatter
 */
export function hasFrontmatter(input: string): boolean {
  return FRONTMATTER_REGEX.test(input);
}

/**
 * Strip frontmatter from input, returning only DSL content
 */
export function stripFrontmatter(input: string): string {
  return input.replace(FRONTMATTER_REGEX, '');
}
