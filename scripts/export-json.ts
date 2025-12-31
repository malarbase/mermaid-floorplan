/**
 * Script to export floorplan DSL to JSON for 3D viewing
 * Usage: npx tsx scripts/export-json.ts <input.floorplan> [output.json]
 * 
 * Uses the shared convertFloorplanToJson function from floorplans-language.
 */

import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import type { Floorplan } from "floorplans-language";
import { createFloorplansServices, convertFloorplanToJson, formatSummaryTable } from "floorplans-language";
import * as fs from "fs";
import * as path from "path";

// Re-export types for external use
export type {
    JsonExport,
    JsonFloor,
    JsonRoom,
    JsonWall,
    JsonConnection,
    JsonConfig,
    JsonStyle,
} from "floorplans-language";

// Initialize services
const services = createFloorplansServices(EmptyFileSystem);
const parse = parseHelper<Floorplan>(services.Floorplans);

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error("Usage: npx tsx scripts/export-json.ts <input.floorplan> [output.json]");
        process.exit(1);
    }

    const inputPath = path.resolve(args[0]);
    const outputPath = args.length > 1 ? path.resolve(args[1]) : inputPath.replace(/\.floorplan$/, ".json");

    if (!fs.existsSync(inputPath)) {
        console.error(`Error: Input file not found: ${inputPath}`);
        process.exit(1);
    }

    const dslContent = fs.readFileSync(inputPath, "utf-8");
    const doc = await parse(dslContent);

    if (doc.parseResult.parserErrors.length > 0) {
        console.error("Parse errors:");
        for (const error of doc.parseResult.parserErrors) {
            console.error(`  - ${error.message}`);
        }
        process.exit(1);
    }

    // Run validation checks
    const validationErrors = await services.Floorplans.validation.DocumentValidator.validateDocument(doc);
    const errors = validationErrors.filter(e => e.severity === 1); // 1 = Error
    const warnings = validationErrors.filter(e => e.severity === 2); // 2 = Warning
    
    if (errors.length > 0) {
        console.error("\nValidation errors:");
        for (const error of errors) {
            const line = error.range ? ` (line ${error.range.start.line + 1})` : "";
            console.error(`  ✗ ${error.message}${line}`);
        }
        process.exit(1);
    }
    
    if (warnings.length > 0) {
        console.warn("\n⚠ Validation warnings:");
        for (const warning of warnings) {
            const line = warning.range ? ` (line ${warning.range.start.line + 1})` : "";
            console.warn(`  ⚠ ${warning.message}${line}`);
        }
        console.log(); // blank line after warnings
    }

    // Use shared conversion logic (single source of truth)
    const result = convertFloorplanToJson(doc.parseResult.value);

    if (result.errors.length > 0) {
        console.error("Conversion errors:");
        for (const error of result.errors) {
            const prefix = error.floor ? `Floor ${error.floor}: ` : "";
            console.error(`  - ${prefix}${error.message}`);
        }
        // Continue with partial export if we have data
    }

    if (!result.data) {
        console.error("Error: No data to export");
        process.exit(1);
    }

    fs.writeFileSync(outputPath, JSON.stringify(result.data, null, 2));
    console.log(`Exported JSON to ${outputPath}`);
    
    // Print summary table
    if (result.data.summary && result.data.floors.length > 0) {
        const floorMetrics = result.data.floors
            .map(f => f.metrics)
            .filter((m): m is NonNullable<typeof m> => m !== undefined);
        console.log("\n" + formatSummaryTable(result.data.summary, floorMetrics));
    }
}

main().catch(console.error);
