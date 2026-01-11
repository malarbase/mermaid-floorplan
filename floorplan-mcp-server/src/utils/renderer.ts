/**
 * Floorplan rendering utilities for MCP server
 * 
 * This module uses the shared rendering from the floorplans-language package.
 * Following Mermaid's convention: grammar + rendering in same diagram folder.
 * 
 * The language package exports everything needed for rendering,
 * this file adds MCP-specific functionality (SVG to PNG conversion).
 */

import { Resvg } from "@resvg/resvg-js";
import type { LangiumDocument } from "langium";
import type { Floorplan, RenderOptions, AreaUnit, LengthUnit } from "floorplans-language";
import { render } from "floorplans-language";

export interface GenerateSvgOptions {
  /** Floor index to render (default: 0) */
  floorIndex?: number;
  /** Render all floors in a single SVG */
  renderAllFloors?: boolean;
  /** Layout for multi-floor rendering */
  multiFloorLayout?: 'stacked' | 'sideBySide';
  /** Show room area inside rooms */
  showArea?: boolean;
  /** Show dimension lines on room edges */
  showDimensions?: boolean;
  /** Show floor summary panel */
  showFloorSummary?: boolean;
  /** Unit for area display */
  areaUnit?: AreaUnit;
  /** Unit for dimension labels */
  lengthUnit?: LengthUnit;
}

/**
 * Generate SVG from parsed floorplan document
 * Uses the shared renderer from floorplans-language
 */
export function generateSvg(
  document: LangiumDocument<Floorplan>,
  options: GenerateSvgOptions = {}
): string {
  const renderOptions: RenderOptions = {
    includeStyles: true,
    padding: 2,
    floorIndex: options.floorIndex,
    renderAllFloors: options.renderAllFloors,
    multiFloorLayout: options.multiFloorLayout,
    // Annotation options
    showArea: options.showArea,
    showDimensions: options.showDimensions,
    showFloorSummary: options.showFloorSummary,
    areaUnit: options.areaUnit,
    lengthUnit: options.lengthUnit,
  };
  
  return render(document, renderOptions);
}

/**
 * Convert SVG to PNG using resvg
 * This is MCP-server specific (not needed in web app which uses native SVG)
 */
export async function svgToPng(svg: string, width = 800, _height = 600): Promise<Buffer> {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: "white",
  });
  return resvg.render().asPng();
}
