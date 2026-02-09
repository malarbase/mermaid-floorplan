/**
 * Unified Generator API for Floorplan DSL
 *
 * Following Langium's generator pattern, this provides a single entry point
 * for converting parsed Floorplan documents into various output formats.
 *
 * Supported formats:
 * - 'svg': Vector graphics for 2D visualization
 * - 'json': Structured data for 3D viewer (Three.js)
 *
 * @example
 * ```ts
 * const result = generate(document, 'svg', { scale: 15 });
 * if (result.errors.length === 0) {
 *   console.log(result.data);
 * }
 * ```
 */

import type { LangiumDocument } from 'langium';
import type { Floorplan } from '../../generated/ast.js';
import { type ConversionError, convertFloorplanToJson, type JsonExport } from './json-converter.js';
import { type RenderOptions, render } from './renderer.js';

// ============================================================================
// Generator Types
// ============================================================================

/** Supported output formats */
export type GeneratorFormat = 'svg' | 'json';

/** Options for SVG generation */
export interface SvgGeneratorOptions extends RenderOptions {
  format: 'svg';
}

/** Options for JSON generation */
export interface JsonGeneratorOptions {
  format: 'json';
}

/** Union of all generator options */
export type GeneratorOptions = SvgGeneratorOptions | JsonGeneratorOptions;

/** Error from the generation process */
export interface GeneratorError {
  message: string;
  /** Optional floor ID if error is floor-specific */
  floor?: string;
  /** Error type for categorization */
  type: 'parse' | 'resolution' | 'render';
}

/** Result from SVG generation */
export interface SvgGeneratorResult {
  format: 'svg';
  /** Generated SVG string, or null if generation failed */
  data: string | null;
  /** Any errors encountered during generation */
  errors: GeneratorError[];
}

/** Result from JSON generation */
export interface JsonGeneratorResult {
  format: 'json';
  /** Generated JSON export, or null if generation failed */
  data: JsonExport | null;
  /** Any errors encountered during generation */
  errors: GeneratorError[];
}

/** Union of all generator results */
export type GeneratorResult = SvgGeneratorResult | JsonGeneratorResult;

// ============================================================================
// Unified Generator API
// ============================================================================

/**
 * Generate output from a parsed Floorplan document.
 *
 * This is the unified entry point for all code generation, following Langium's
 * generator API pattern. It dispatches to format-specific generators while
 * providing a consistent interface.
 *
 * @param document - Parsed Langium document containing the Floorplan AST
 * @param format - Output format: 'svg' for vector graphics, 'json' for 3D data
 * @param options - Format-specific options
 * @returns Generation result with data and any errors
 *
 * @example SVG generation
 * ```ts
 * const result = generate(document, 'svg', {
 *   scale: 15,
 *   renderAllFloors: true
 * });
 * ```
 *
 * @example JSON generation for 3D viewer
 * ```ts
 * const result = generate(document, 'json');
 * if (result.data) {
 *   viewer.loadFloorplan(result.data);
 * }
 * ```
 */
export function generate(
  document: LangiumDocument<Floorplan>,
  format: 'svg',
  options?: Omit<SvgGeneratorOptions, 'format'>,
): SvgGeneratorResult;

export function generate(
  document: LangiumDocument<Floorplan>,
  format: 'json',
  options?: Omit<JsonGeneratorOptions, 'format'>,
): JsonGeneratorResult;

export function generate(
  document: LangiumDocument<Floorplan>,
  format: GeneratorFormat,
  options?: Omit<GeneratorOptions, 'format'>,
): GeneratorResult {
  // Check for parse errors first
  const parseErrors = document.parseResult.parserErrors;
  if (parseErrors.length > 0) {
    const errors: GeneratorError[] = parseErrors.map((e) => ({
      message: e.message,
      type: 'parse' as const,
    }));

    if (format === 'svg') {
      return { format: 'svg', data: null, errors };
    } else {
      return { format: 'json', data: null, errors };
    }
  }

  // Dispatch to format-specific generator
  switch (format) {
    case 'svg':
      return generateSvg(document, options as RenderOptions);
    case 'json':
      return generateJson(document);
    default: {
      // Type guard - should never reach here
      const _exhaustive: never = format;
      throw new Error(`Unknown format: ${_exhaustive}`);
    }
  }
}

// ============================================================================
// Format-Specific Generators
// ============================================================================

/**
 * Generate SVG from a Floorplan document
 */
function generateSvg(
  document: LangiumDocument<Floorplan>,
  options?: RenderOptions,
): SvgGeneratorResult {
  try {
    const svg = render(document, options);
    return {
      format: 'svg',
      data: svg,
      errors: [],
    };
  } catch (error) {
    return {
      format: 'svg',
      data: null,
      errors: [
        {
          message: error instanceof Error ? error.message : 'Unknown rendering error',
          type: 'render',
        },
      ],
    };
  }
}

/**
 * Generate JSON from a Floorplan document
 */
function generateJson(document: LangiumDocument<Floorplan>): JsonGeneratorResult {
  const floorplan = document.parseResult.value;
  const result = convertFloorplanToJson(floorplan);

  // Convert ConversionError to GeneratorError
  const errors: GeneratorError[] = result.errors.map((e: ConversionError) => ({
    message: e.message,
    floor: e.floor,
    type: 'resolution' as const,
  }));

  return {
    format: 'json',
    data: result.data,
    errors,
  };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Generate SVG with default options
 * Convenience wrapper around generate() for simple SVG generation
 */
export function generateToSvg(
  document: LangiumDocument<Floorplan>,
  options?: RenderOptions,
): SvgGeneratorResult {
  return generate(document, 'svg', options);
}

/**
 * Generate JSON for 3D viewing
 * Convenience wrapper around generate() for JSON generation
 */
export function generateToJson(document: LangiumDocument<Floorplan>): JsonGeneratorResult {
  return generate(document, 'json');
}
