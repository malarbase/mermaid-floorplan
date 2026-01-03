/**
 * Script to generate 3D PNG files from a floorplan DSL file
 * Usage: npx tsx scripts/generate-3d-images.ts <input.floorplan> [output-dir] [options]
 * 
 * Options:
 *   --all               Render all floors in a single 3D view
 *   --projection MODE   Camera projection: 'isometric' (default) or 'perspective'
 *   --camera-pos X,Y,Z  Camera position for perspective mode
 *   --camera-target X,Y,Z Camera look-at target for perspective mode
 *   --fov N             Field of view in degrees (default: 50)
 *   --width N           Output width in pixels (default: 1200)
 *   --height N          Output height in pixels (default: 900)
 *   --scale N           Scale factor (for annotation text size)
 * 
 * Uses the floorplan 3D renderer from the mcp-server package.
 */

import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import type { Floorplan } from "floorplans-language";
import { createFloorplansServices, convertFloorplanToJson } from "floorplans-language";
import { render3DToPng, closeBrowser } from "floorplans-mcp-server/utils/renderer3d";
import * as fs from "fs";
import * as path from "path";

const services = createFloorplansServices(EmptyFileSystem);
const parse = parseHelper<Floorplan>(services.Floorplans);

interface Options {
  inputFile: string;
  outputDir: string;
  renderAll: boolean;
  projection: 'isometric' | 'perspective';
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
  fov: number;
  width: number;
  height: number;
  scale: number;
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    inputFile: "TriplexVilla.floorplan",
    outputDir: ".",
    renderAll: false,
    projection: 'isometric',
    fov: 50,
    width: 1200,
    height: 900,
    scale: 15,
  };

  const positionalArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--all") {
      options.renderAll = true;
    } else if (arg === "--projection" && i + 1 < args.length) {
      const mode = args[++i] as 'isometric' | 'perspective';
      if (mode === 'isometric' || mode === 'perspective') {
        options.projection = mode;
      }
    } else if (arg === "--camera-pos" && i + 1 < args.length) {
      const parts = args[++i].split(',').map(Number);
      if (parts.length === 3 && parts.every(n => !isNaN(n))) {
        options.cameraPosition = parts as [number, number, number];
      }
    } else if (arg === "--camera-target" && i + 1 < args.length) {
      const parts = args[++i].split(',').map(Number);
      if (parts.length === 3 && parts.every(n => !isNaN(n))) {
        options.cameraTarget = parts as [number, number, number];
      }
    } else if (arg === "--fov" && i + 1 < args.length) {
      options.fov = parseInt(args[++i], 10);
    } else if (arg === "--width" && i + 1 < args.length) {
      options.width = parseInt(args[++i], 10);
    } else if (arg === "--height" && i + 1 < args.length) {
      options.height = parseInt(args[++i], 10);
    } else if (arg === "--scale" && i + 1 < args.length) {
      options.scale = parseInt(args[++i], 10);
    } else if (!arg.startsWith("--")) {
      positionalArgs.push(arg);
    }
  }

  if (positionalArgs.length > 0) options.inputFile = positionalArgs[0];
  if (positionalArgs.length > 1) options.outputDir = positionalArgs[1];

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const inputPath = path.resolve(options.inputFile);
  const outputDirPath = path.resolve(options.outputDir);

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

  const floorplan = doc.parseResult.value;
  const baseName = path.basename(options.inputFile, path.extname(options.inputFile));

  if (!fs.existsSync(outputDirPath)) {
    fs.mkdirSync(outputDirPath, { recursive: true });
  }

  // Convert to JSON for 3D rendering
  const jsonResult = convertFloorplanToJson(floorplan);
  if (!jsonResult.data) {
    console.error("Error: Failed to convert floorplan to JSON");
    if (jsonResult.errors?.length) {
      for (const error of jsonResult.errors) {
        console.error(`  - ${error}`);
      }
    }
    process.exit(1);
  }

  const projectionLabel = options.projection === 'perspective' ? 'perspective' : 'isometric';
  console.log(`Generating 3D PNG (${projectionLabel}) for ${floorplan.floors.length} floor(s)...`);
  console.log(`Dimensions: ${options.width}x${options.height}`);
  if (options.projection === 'perspective' && options.cameraPosition) {
    console.log(`Camera position: ${options.cameraPosition.join(', ')}`);
  }
  console.log();

  // Render individual floors in 3D
  if (!options.renderAll) {
    for (let i = 0; i < floorplan.floors.length; i++) {
      const floor = floorplan.floors[i];
      try {
        const result = await render3DToPng(jsonResult.data, {
          width: options.width,
          height: options.height,
          projection: options.projection,
          cameraPosition: options.cameraPosition,
          cameraTarget: options.cameraTarget,
          fov: options.fov,
          floorIndex: i,
          renderAllFloors: false,
        });

        const pngPath = path.join(outputDirPath, `${baseName}-${floor.id}-3D.png`);
        fs.writeFileSync(pngPath, result.pngBuffer);
        console.log(`  ✓ 3D PNG: ${pngPath} (${floor.rooms.length} rooms)`);
      } catch (error) {
        console.error(`  ✗ Failed to render ${floor.id}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  // Render all floors in a single 3D image
  if (options.renderAll || floorplan.floors.length === 1) {
    try {
      const result = await render3DToPng(jsonResult.data, {
        width: options.width,
        height: options.height,
        projection: options.projection,
        cameraPosition: options.cameraPosition,
        cameraTarget: options.cameraTarget,
        fov: options.fov,
        renderAllFloors: true,
      });

      const suffix = floorplan.floors.length > 1 ? '-AllFloors-3D.png' : '-3D.png';
      const pngPath = path.join(outputDirPath, `${baseName}${suffix}`);
      fs.writeFileSync(pngPath, result.pngBuffer);
      console.log(`  ✓ 3D PNG: ${pngPath} (${floorplan.floors.length} floor(s))`);

      // Log scene bounds for reference
      const bounds = result.metadata.sceneBounds;
      console.log(`\n  Scene bounds: [${bounds.min.x.toFixed(1)}, ${bounds.min.z.toFixed(1)}] to [${bounds.max.x.toFixed(1)}, ${bounds.max.z.toFixed(1)}]`);
    } catch (error) {
      console.error(`  ✗ Failed to render 3D view: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  }

  console.log("\nDone!");
  
  // Clean up browser instance
  await closeBrowser();
}

main().catch(console.error);

