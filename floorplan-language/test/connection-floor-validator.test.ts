/**
 * Tests for `checkConnectionFloorConsistency`.
 *
 * The grammar accepts cross-floor `connect` statements (room references
 * are scoped globally), but the renderer can't route a horizontal
 * connection across floors and silently drops them. This validator
 * surfaces the issue at author time and points users at `vertical`.
 */

import type { Floorplan } from 'floorplan-language';
import { createFloorplansServices } from 'floorplan-language';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, it } from 'vitest';

let services: ReturnType<typeof createFloorplansServices>;
let parse: ReturnType<typeof parseHelper<Floorplan>>;

beforeAll(async () => {
  services = createFloorplansServices(EmptyFileSystem);
  parse = parseHelper<Floorplan>(services.Floorplans);
});

/**
 * Helper: parse + validate, return only the diagnostics emitted by
 * `checkConnectionFloorConsistency` (matched by message prefix).
 */
async function validateAndGetCrossFloorWarnings(dsl: string) {
  const document = await parse(dsl);
  await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
  return (document.diagnostics ?? []).filter((d) =>
    d.message.startsWith('Connection spans floors:'),
  );
}

describe('checkConnectionFloorConsistency', () => {
  it('does not warn for an intra-floor connection', async () => {
    const dsl = `
      floorplan
        floor f1 {
          room A at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          room B at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
        connect A.right to B.left door at 50%
    `;
    const warnings = await validateAndGetCrossFloorWarnings(dsl);
    expect(warnings).toHaveLength(0);
  });

  it('does not warn for an exterior connection', async () => {
    const dsl = `
      floorplan
        floor f1 {
          room Patio at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
        connect Patio.top to outside door at 50%
    `;
    const warnings = await validateAndGetCrossFloorWarnings(dsl);
    expect(warnings).toHaveLength(0);
  });

  it('warns when a connection spans two floors', async () => {
    const dsl = `
      floorplan
        floor f1 {
          room Living at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
        floor f2 {
          room Bedroom at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
        connect Living.right to Bedroom.left door at 50%
    `;
    const warnings = await validateAndGetCrossFloorWarnings(dsl);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe(2 /* DiagnosticSeverity.Warning */);
    expect(warnings[0].message).toContain("'Living' is on floor 'f1'");
    expect(warnings[0].message).toContain("'Bedroom' is on floor 'f2'");
    expect(warnings[0].message).toContain('vertical f1.<element> to f2.<element>');
  });

  it('does not warn for a vertical connection (the suggested fix)', async () => {
    const dsl = `
      floorplan
        floor f1 {
          room Living at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          stair S1 at (5,5) rise 3
        }
        floor f2 {
          room Bedroom at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          stair S2 at (5,5) rise 3
        }
        vertical f1.S1 to f2.S2
    `;
    const warnings = await validateAndGetCrossFloorWarnings(dsl);
    expect(warnings).toHaveLength(0);
  });

  it('warns once per cross-floor connection (not per pair of rooms)', async () => {
    const dsl = `
      floorplan
        floor f1 {
          room A at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          room B at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
        floor f2 {
          room C at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
          room D at (10,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
        connect A.right to C.left door at 50%
        connect B.right to D.left door at 50%
    `;
    const warnings = await validateAndGetCrossFloorWarnings(dsl);
    expect(warnings).toHaveLength(2);
  });

  it('treats sub-rooms as belonging to their host floor', async () => {
    const dsl = `
      floorplan
        floor f1 {
          room Hall at (0,0) size (20 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
            composed of [
              sub-room Nook at (0,0) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
            ]
        }
        floor f2 {
          room Lounge at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
        connect Nook.right to Lounge.left door at 50%
    `;
    const warnings = await validateAndGetCrossFloorWarnings(dsl);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain("'Nook' is on floor 'f1'");
    expect(warnings[0].message).toContain("'Lounge' is on floor 'f2'");
  });
});
