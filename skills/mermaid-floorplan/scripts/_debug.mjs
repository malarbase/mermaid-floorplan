import { parseDsl, runLangiumValidation } from '/Users/malar/Personal/Code/mermaid-floorplan/.cursor/skills/mermaid-floorplan/scripts/_lib.mjs';
import { buildCriticContext, extractConnectionsFromAst } from '/Users/malar/Personal/Code/mermaid-floorplan/.cursor/skills/mermaid-floorplan/scripts/_critic_lib.mjs';
import { convertFloorplanToJson } from 'floorplan-language';
import { readFileSync } from 'fs';
const dsl = readFileSync('/tmp/townhouse-skel.floorplan', 'utf8');
const { document } = await parseDsl(dsl);
await runLangiumValidation(document);
const floorplan = document.parseResult.value;
const json = convertFloorplanToJson(floorplan);
const astConnections = extractConnectionsFromAst(floorplan);
const ctx = buildCriticContext(json.data.floors, astConnections, json.data.verticalConnections ?? [], json.data.config ?? {});
for (const f of ctx.floors) {
  console.log('floor:', f.floorId);
  for (const c of f.connections ?? []) {
    console.log('  ', JSON.stringify({fromRoom:c.fromRoom, fromWall:c.fromWall, toRoom:c.toRoom, toWall:c.toWall, type:c.type, position:c.position}));
  }
}
