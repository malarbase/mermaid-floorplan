/**
 * Script to export floorplan DSL to DXF format (AutoCAD compatible)
 * Usage: npx tsx scripts/export-dxf.ts <input.floorplan> [output.dxf]
 *
 * Options:
 *   --floor <id>     Export only the specified floor
 *   --all-in-one     Export all floors to a single DXF file
 *   --no-labels      Disable room labels
 *   --dimensions     Include dimension lines
 *
 * Uses the DXF exporter from floorplan-language.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Floorplan } from 'floorplan-language';
import {
  convertFloorplanToJson,
  createFloorplansServices,
  exportFloorplanToDxf,
  exportFloorToDxf,
} from 'floorplan-language';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';

// Initialize services
const services = createFloorplansServices(EmptyFileSystem);
const parse = parseHelper<Floorplan>(services.Floorplans);

interface ExportOptions {
  inputPath: string;
  outputPath?: string;
  floor?: string;
  allInOne: boolean;
  includeLabels: boolean;
  includeDimensions: boolean;
}

function parseArgs(): ExportOptions {
  const args = process.argv.slice(2);
  const options: ExportOptions = {
    inputPath: '',
    allInOne: false,
    includeLabels: true,
    includeDimensions: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--floor' && i + 1 < args.length) {
      options.floor = args[++i];
    } else if (arg === '--all-in-one') {
      options.allInOne = true;
    } else if (arg === '--no-labels') {
      options.includeLabels = false;
    } else if (arg === '--dimensions') {
      options.includeDimensions = true;
    } else if (!arg.startsWith('-')) {
      if (!options.inputPath) {
        options.inputPath = arg;
      } else if (!options.outputPath) {
        options.outputPath = arg;
      }
    }
    i++;
  }

  return options;
}

async function main() {
  const options = parseArgs();

  if (!options.inputPath) {
    console.error('Usage: npx tsx scripts/export-dxf.ts <input.floorplan> [output.dxf]');
    console.error('\nOptions:');
    console.error('  --floor <id>     Export only the specified floor');
    console.error('  --all-in-one     Export all floors to a single DXF file');
    console.error('  --no-labels      Disable room labels');
    console.error('  --dimensions     Include dimension lines');
    process.exit(1);
  }

  const inputPath = path.resolve(options.inputPath);
  const baseName = path.basename(inputPath, '.floorplan');
  const outputDir = path.dirname(inputPath);

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const dslContent = fs.readFileSync(inputPath, 'utf-8');
  const doc = await parse(dslContent);

  if (doc.parseResult.parserErrors.length > 0) {
    console.error('Parse errors:');
    for (const error of doc.parseResult.parserErrors) {
      console.error(`  - ${error.message}`);
    }
    process.exit(1);
  }

  // Convert to JSON format
  const result = convertFloorplanToJson(doc.parseResult.value);

  if (result.errors.length > 0) {
    console.error('Conversion errors:');
    for (const error of result.errors) {
      const prefix = error.floor ? `Floor ${error.floor}: ` : '';
      console.error(`  - ${prefix}${error.message}`);
    }
  }

  if (!result.data) {
    console.error('Error: No data to export');
    process.exit(1);
  }

  const { floors, connections, config } = result.data;

  const exportOptions = {
    includeLabels: options.includeLabels,
    includeDimensions: options.includeDimensions,
    wallThickness: config?.wall_thickness ?? 0.5,
    units: config?.default_unit ?? 'ft',
  };

  // Filter floors if --floor specified
  let floorsToExport = floors;
  if (options.floor) {
    floorsToExport = floors.filter((f) => f.id === options.floor);
    if (floorsToExport.length === 0) {
      console.error(`Error: Floor "${options.floor}" not found`);
      console.error(`Available floors: ${floors.map((f) => f.id).join(', ')}`);
      process.exit(1);
    }
  }

  if (options.allInOne || floorsToExport.length === 1) {
    // Export all floors to a single file
    const outputPath = options.outputPath ?? path.join(outputDir, `${baseName}.dxf`);

    const dxfResult = exportFloorplanToDxf(floorsToExport, connections, config, exportOptions);

    fs.writeFileSync(outputPath, dxfResult.content);
    console.log(`Exported DXF to ${outputPath}`);
    console.log(`  ${dxfResult.roomCount} rooms, ${dxfResult.connectionCount} connections`);

    if (dxfResult.warnings.length > 0) {
      console.warn('Warnings:');
      for (const w of dxfResult.warnings) {
        console.warn(`  - ${w}`);
      }
    }
  } else {
    // Export each floor to separate files
    for (const floor of floorsToExport) {
      const floorName = floor.id.replace(/[^a-zA-Z0-9]/g, '-');
      const outputPath = path.join(outputDir, `${baseName}-${floorName}.dxf`);

      // Filter connections for this floor
      const floorConnections = connections.filter((conn) =>
        floor.rooms.some((r) => r.name === conn.fromRoom),
      );

      const dxfResult = exportFloorToDxf(floor, floorConnections, exportOptions);

      fs.writeFileSync(outputPath, dxfResult.content);
      console.log(`Exported ${floor.id} to ${outputPath}`);
      console.log(`  ${dxfResult.roomCount} rooms, ${dxfResult.connectionCount} connections`);
    }
  }
}

main().catch(console.error);
