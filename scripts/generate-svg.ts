/**
 * Script to generate SVG files from a floorplan DSL file
 * Usage: npx tsx scripts/generate-svg.ts <input.floorplan> [output-dir]
 * 
 * Uses the floorplan diagram renderer from the language package.
 * Following Mermaid's convention: grammar + rendering in same diagram folder.
 */

import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import type { Floorplan } from "floorplans-language";
import { createFloorplansServices, renderFloor, render } from "floorplans-language";
import * as fs from "fs";
import * as path from "path";

const services = createFloorplansServices(EmptyFileSystem);
const parse = parseHelper<Floorplan>(services.Floorplans);

async function main() {
  const args = process.argv.slice(2);
  const inputFile = args[0] || "TriplexVilla.floorplan";
  const outputDir = args[1] || ".";
  const renderAll = args.includes("--all");

  const inputPath = path.resolve(inputFile);
  const outputDirPath = path.resolve(outputDir);

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
  const baseName = path.basename(inputFile, path.extname(inputFile));

  if (!fs.existsSync(outputDirPath)) {
    fs.mkdirSync(outputDirPath, { recursive: true });
  }

  console.log(`Generating SVGs for ${floorplan.floors.length} floor(s)...`);
  console.log(`Found ${floorplan.connections.length} connection(s)`);

  // Render individual floors
  for (let i = 0; i < floorplan.floors.length; i++) {
    const floor = floorplan.floors[i];
    const svg = renderFloor(floor, {
      includeXmlDeclaration: true,
      includeStyles: true,
      padding: 2,
      scale: 15,
    }, floorplan.connections);
    const outputPath = path.join(outputDirPath, `${baseName}-${floor.id}.svg`);
    fs.writeFileSync(outputPath, svg);
    console.log(`  ✓ Generated: ${outputPath} (${floor.rooms.length} rooms)`);
  }

  // Optionally render all floors in one image
  if (renderAll && floorplan.floors.length > 1) {
    const allFloorsSvg = render(doc, {
      includeXmlDeclaration: true,
      includeStyles: true,
      padding: 2,
      scale: 15,
      renderAllFloors: true,
      multiFloorLayout: 'sideBySide',
    });
    const allFloorsPath = path.join(outputDirPath, `${baseName}-AllFloors.svg`);
    fs.writeFileSync(allFloorsPath, allFloorsSvg);
    console.log(`  ✓ Generated: ${allFloorsPath} (all floors)`);
  }

  console.log("\nDone!");
}

main().catch(console.error);
