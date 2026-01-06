/**
 * Browser-compatible DSL parser for floorplan files
 * Converts .floorplan DSL to JSON format for the 3D viewer
 * 
 * This module creates a direct parser without using langium/test
 * which has Node.js-specific dependencies (node:assert)
 */

import { EmptyFileSystem, URI, type LangiumDocument } from "langium";
import type { Floorplan } from "floorplans-language";
import { createFloorplansServices, convertFloorplanToJson } from "floorplans-language";
import type { JsonExport } from "floorplan-3d-core";

// Initialize Langium services with EmptyFileSystem (browser-compatible)
const services = createFloorplansServices(EmptyFileSystem);

let documentId = 1;

/**
 * Browser-compatible parse function that doesn't use langium/test
 */
async function parseDSL(input: string): Promise<LangiumDocument<Floorplan>> {
    const uri = URI.parse(`file:///floorplan-${documentId++}.fp`);
    const document = services.shared.workspace.LangiumDocumentFactory.fromString<Floorplan>(input, uri);
    services.shared.workspace.LangiumDocuments.addDocument(document);
    await services.shared.workspace.DocumentBuilder.build([document]);
    return document;
}

export interface ParseError {
    message: string;
    line?: number;
    column?: number;
}

export interface ParseResult {
    data: JsonExport | null;
    errors: ParseError[];
    warnings: ParseError[];
}

export interface ParseResultWithDocument extends ParseResult {
    document: LangiumDocument<Floorplan> | null;
}

/**
 * Parse a floorplan DSL string and convert to JSON format.
 * Uses the shared convertFloorplanToJson function from floorplans-language.
 */
export async function parseFloorplanDSL(dslContent: string): Promise<ParseResult> {
    const result = await parseFloorplanDSLWithDocument(dslContent);
    // Return without the document for backwards compatibility
    return {
        data: result.data,
        errors: result.errors,
        warnings: result.warnings,
    };
}

/**
 * Parse a floorplan DSL string and convert to JSON format.
 * Also returns the Langium document for 2D rendering.
 */
export async function parseFloorplanDSLWithDocument(dslContent: string): Promise<ParseResultWithDocument> {
    const errors: ParseError[] = [];
    const warnings: ParseError[] = [];

    try {
        const doc = await parseDSL(dslContent);

        // Collect parse errors
        for (const error of doc.parseResult.parserErrors) {
            errors.push({
                message: error.message,
                line: error.token?.startLine,
                column: error.token?.startColumn,
            });
        }

        for (const error of doc.parseResult.lexerErrors) {
            errors.push({
                message: error.message,
                line: error.line,
                column: error.column,
            });
        }

        if (errors.length > 0) {
            return { data: null, document: null, errors, warnings };
        }

        // Run validation checks
        const validationDiagnostics = await services.Floorplans.validation.DocumentValidator.validateDocument(doc);
        for (const diag of validationDiagnostics) {
            const diagError: ParseError = {
                message: diag.message,
                line: diag.range ? diag.range.start.line + 1 : undefined,
                column: diag.range ? diag.range.start.character + 1 : undefined,
            };
            
            if (diag.severity === 1) { // Error
                errors.push(diagError);
            } else if (diag.severity === 2) { // Warning
                warnings.push(diagError);
            }
        }

        if (errors.length > 0) {
            return { data: null, document: null, errors, warnings };
        }

        // Use shared conversion logic (single source of truth)
        const result = convertFloorplanToJson(doc.parseResult.value);

        // Convert conversion errors to parse errors
        for (const err of result.errors) {
            errors.push({
                message: err.floor ? `Floor ${err.floor}: ${err.message}` : err.message,
            });
        }

        if (errors.length > 0) {
            return { data: null, document: null, errors, warnings };
        }

        return { data: result.data, document: doc, errors: [], warnings };

    } catch (err) {
        errors.push({
            message: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`
        });
        return { data: null, document: null, errors, warnings };
    }
}

/**
 * Check if a filename is a floorplan DSL file
 */
export function isFloorplanFile(filename: string): boolean {
    return filename.toLowerCase().endsWith('.floorplan');
}

/**
 * Check if a filename is a JSON file
 */
export function isJsonFile(filename: string): boolean {
    return filename.toLowerCase().endsWith('.json');
}

