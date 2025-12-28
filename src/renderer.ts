/**
 * Main app floorplan renderer
 * 
 * Uses the floorplan diagram renderer from the language package.
 * Following Mermaid's convention: grammar + rendering in same diagram folder.
 */

import type { Floorplan } from "floorplans-language";
import type { LangiumDocument } from "langium";
import { render } from "floorplans-language";

export default async function renderFloorplan(
  document: LangiumDocument<Floorplan>
): Promise<string> {
  return render(document);
}
