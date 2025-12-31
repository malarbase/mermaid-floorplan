/**
 * Script to generate SVG and PNG files from a floorplan DSL file
 * Usage: npx tsx scripts/generate-images.ts <input.floorplan> [output-dir] [options]
 * 
 * Options:
 *   --all           Render all floors in a single combined image
 *   --png           Generate PNG files (in addition to SVG)
 *   --svg-only      Generate only SVG files (default generates both)
 *   --png-only      Generate only PNG files
 *   --scale N       Scale factor for rendering (default: 15)
 *   --show-area     Show room areas inside rooms
 *   --show-dims     Show dimension lines on room edges
 *   --show-summary  Show floor summary panel
 *   --area-unit U   Area unit: 'sqft' or 'sqm' (default: sqft)
 *   --length-unit U Length unit for dimensions: 'm', 'ft', 'cm', 'in', 'mm' (default: ft)
 * 
 * Uses the floorplan diagram renderer from the language package.
 * Reuses PNG conversion from the MCP server package.
 */

import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import type { Floorplan, AreaUnit, LengthUnit } from "floorplans-language";
import { createFloorplansServices, renderFloor, render, resolveVariables, buildStyleContext, convertFloorplanToJson, formatSummaryTable } from "floorplans-language";
import { svgToPng } from "floorplans-mcp-server/utils/renderer";
import * as fs from "fs";
import * as path from "path";

const services = createFloorplansServices(EmptyFileSystem);
const parse = parseHelper<Floorplan>(services.Floorplans);

async function convertToPng(svgContent: string, outputPath: string, width: number): Promise<boolean> {
  const pngBuffer = await svgToPng(svgContent, width);
  fs.writeFileSync(outputPath, pngBuffer);
  return true;
}

interface Options {
  inputFile: string;
  outputDir: string;
  renderAll: boolean;
  generateSvg: boolean;
  generatePng: boolean;
  scale: number;
  showArea: boolean;
  showDimensions: boolean;
  showFloorSummary: boolean;
  areaUnit: AreaUnit;
  lengthUnit: LengthUnit;
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    inputFile: "TriplexVilla.floorplan",
    outputDir: ".",
    renderAll: false,
    generateSvg: true,
    generatePng: true,
    scale: 15,
    showArea: false,
    showDimensions: false,
    showFloorSummary: false,
    areaUnit: 'sqft',
    lengthUnit: 'ft',
  };

  const positionalArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--all") {
      options.renderAll = true;
    } else if (arg === "--png") {
      options.generatePng = true;
    } else if (arg === "--svg-only") {
      options.generateSvg = true;
      options.generatePng = false;
    } else if (arg === "--png-only") {
      options.generateSvg = false;
      options.generatePng = true;
    } else if (arg === "--scale" && i + 1 < args.length) {
      options.scale = parseInt(args[++i], 10);
    } else if (arg === "--show-area") {
      options.showArea = true;
    } else if (arg === "--show-dims") {
      options.showDimensions = true;
    } else if (arg === "--show-summary") {
      options.showFloorSummary = true;
    } else if (arg === "--area-unit" && i + 1 < args.length) {
      const unit = args[++i];
      if (unit === 'sqft' || unit === 'sqm') {
        options.areaUnit = unit;
      }
    } else if (arg === "--length-unit" && i + 1 < args.length) {
      const unit = args[++i] as LengthUnit;
      if (['m', 'ft', 'cm', 'in', 'mm'].includes(unit)) {
        options.lengthUnit = unit;
      }
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

  const floorplan = doc.parseResult.value;
  const baseName = path.basename(options.inputFile, path.extname(options.inputFile));

  if (!fs.existsSync(outputDirPath)) {
    fs.mkdirSync(outputDirPath, { recursive: true });
  }

  const formats = [
    options.generateSvg ? "SVG" : null,
    options.generatePng ? "PNG" : null,
  ].filter(Boolean).join(" + ");

  const annotations = [
    options.showArea ? `areas (${options.areaUnit})` : null,
    options.showDimensions ? `dimensions (${options.lengthUnit})` : null,
    options.showFloorSummary ? "floor summary" : null,
  ].filter(Boolean);

  console.log(`Generating ${formats} for ${floorplan.floors.length} floor(s)...`);
  console.log(`Found ${floorplan.connections.length} connection(s)`);
  console.log(`Scale: ${options.scale}x`);
  if (annotations.length > 0) {
    console.log(`Annotations: ${annotations.join(", ")}`);
  }
  console.log();

  // Resolve variables and build style context
  const variableResolution = resolveVariables(floorplan);
  const variables = variableResolution.variables;
  const styleContext = buildStyleContext(floorplan);

  // Render individual floors
  for (let i = 0; i < floorplan.floors.length; i++) {
    const floor = floorplan.floors[i];
    const svg = renderFloor(floor, {
      includeXmlDeclaration: true,
      includeStyles: true,
      padding: 2,
      scale: options.scale,
      showArea: options.showArea,
      showDimensions: options.showDimensions,
      showFloorSummary: options.showFloorSummary,
      areaUnit: options.areaUnit,
      lengthUnit: options.lengthUnit,
    }, floorplan.connections, variables, styleContext);

    if (options.generateSvg) {
      const svgPath = path.join(outputDirPath, `${baseName}-${floor.id}.svg`);
      fs.writeFileSync(svgPath, svg);
      console.log(`  ✓ SVG: ${svgPath} (${floor.rooms.length} rooms)`);
    }

    if (options.generatePng) {
      const pngPath = path.join(outputDirPath, `${baseName}-${floor.id}.png`);
      const width = options.scale * 60; // Approximate width based on scale
      const success = await convertToPng(svg, pngPath, width);
      if (success) {
        console.log(`  ✓ PNG: ${pngPath}`);
      }
    }
  }

  // Optionally render all floors in one image
  if (options.renderAll && floorplan.floors.length > 1) {
    const allFloorsSvg = render(doc, {
      includeXmlDeclaration: true,
      includeStyles: true,
      padding: 2,
      scale: options.scale,
      renderAllFloors: true,
      multiFloorLayout: 'sideBySide',
      showArea: options.showArea,
      showDimensions: options.showDimensions,
      showFloorSummary: options.showFloorSummary,
      areaUnit: options.areaUnit,
      lengthUnit: options.lengthUnit,
    });

    if (options.generateSvg) {
      const allFloorsSvgPath = path.join(outputDirPath, `${baseName}-AllFloors.svg`);
      fs.writeFileSync(allFloorsSvgPath, allFloorsSvg);
      console.log(`  ✓ SVG: ${allFloorsSvgPath} (all floors)`);
    }

    if (options.generatePng) {
      const allFloorsPngPath = path.join(outputDirPath, `${baseName}-AllFloors.png`);
      const width = options.scale * 120; // Wider for multi-floor layout
      const success = await convertToPng(allFloorsSvg, allFloorsPngPath, width);
      if (success) {
        console.log(`  ✓ PNG: ${allFloorsPngPath}`);
      }
    }
  }

  // Print summary metrics
  const result = convertFloorplanToJson(floorplan);
  if (result.data?.summary && result.data.floors.length > 0) {
    const floorMetrics = result.data.floors
      .map(f => f.metrics)
      .filter((m): m is NonNullable<typeof m> => m !== undefined);
    console.log("\n" + formatSummaryTable(result.data.summary, floorMetrics));
  }

  console.log("\nDone!");
}

main().catch(console.error);

