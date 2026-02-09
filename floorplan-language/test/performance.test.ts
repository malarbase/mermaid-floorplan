/**
 * Performance Benchmark Tests
 *
 * Measures parsing performance for floorplans of various sizes.
 * Performance targets from add-editor-polish proposal:
 * - Small (10 rooms): < 500ms
 * - Medium (30 rooms): < 500ms
 * - Large (50+ rooms): < 500ms
 */

import type { Floorplan } from 'floorplan-language';
import { createFloorplansServices } from 'floorplan-language';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';

let services: ReturnType<typeof createFloorplansServices>;
let parse: ReturnType<typeof parseHelper<Floorplan>>;

beforeAll(async () => {
  services = createFloorplansServices(EmptyFileSystem);
  parse = parseHelper<Floorplan>(services.Floorplans);
});

/**
 * Generate a floorplan DSL string with the specified number of rooms
 */
function generateFloorplan(roomCount: number): string {
  const rooms: string[] = [];
  const cols = Math.ceil(Math.sqrt(roomCount));

  for (let i = 0; i < roomCount; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = col * 15;
    const y = row * 12;
    rooms.push(
      `        room Room${i + 1} at (${x}, ${y}) size (12 x 10) walls [top: solid, right: solid, bottom: solid, left: solid] label "Room ${i + 1}"`,
    );
  }

  return `floorplan
    floor MainFloor {
${rooms.join('\n')}
    }
`;
}

/**
 * Measure parse time for a floorplan DSL string
 */
async function measureParseTime(dsl: string): Promise<number> {
  const start = performance.now();
  const document = await parse(dsl);
  const end = performance.now();

  // Verify parsing succeeded
  expect(document.parseResult.parserErrors).toHaveLength(0);

  return end - start;
}

describe('Parse Performance Benchmarks', () => {
  const TARGET_MS = 500;

  test('small floorplan (10 rooms) parses in < 500ms', async () => {
    const dsl = generateFloorplan(10);
    const times: number[] = [];

    // Run 3 iterations to get stable measurement
    for (let i = 0; i < 3; i++) {
      times.push(await measureParseTime(dsl));
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`[perf] full-reparse-small: ${avgTime.toFixed(2)}ms (10 rooms)`);

    expect(avgTime).toBeLessThan(TARGET_MS);
  });

  test('medium floorplan (30 rooms) parses in < 500ms', async () => {
    const dsl = generateFloorplan(30);
    const times: number[] = [];

    for (let i = 0; i < 3; i++) {
      times.push(await measureParseTime(dsl));
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`[perf] full-reparse-medium: ${avgTime.toFixed(2)}ms (30 rooms)`);

    expect(avgTime).toBeLessThan(TARGET_MS);
  });

  test('large floorplan (50 rooms) parses in < 500ms', async () => {
    const dsl = generateFloorplan(50);
    const times: number[] = [];

    for (let i = 0; i < 3; i++) {
      times.push(await measureParseTime(dsl));
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`[perf] full-reparse-large: ${avgTime.toFixed(2)}ms (50 rooms)`);

    expect(avgTime).toBeLessThan(TARGET_MS);
  });

  test('extra large floorplan (100 rooms) for stress testing', async () => {
    const dsl = generateFloorplan(100);
    const times: number[] = [];

    for (let i = 0; i < 3; i++) {
      times.push(await measureParseTime(dsl));
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`[perf] full-reparse-xlarge: ${avgTime.toFixed(2)}ms (100 rooms)`);

    // Stress test - 1 second is acceptable for 100 rooms
    expect(avgTime).toBeLessThan(1000);
  });
});

describe('Parse Performance Details', () => {
  test('reports DSL size metrics', async () => {
    const sizes = [10, 30, 50, 100];
    const results: { rooms: number; chars: number; lines: number; parseMs: number }[] = [];

    for (const roomCount of sizes) {
      const dsl = generateFloorplan(roomCount);
      const parseTime = await measureParseTime(dsl);
      results.push({
        rooms: roomCount,
        chars: dsl.length,
        lines: dsl.split('\n').length,
        parseMs: parseTime,
      });
    }

    console.log('\n[perf] Parse Performance Summary:');
    console.log('─'.repeat(50));
    console.log('Rooms | Characters | Lines | Parse Time');
    console.log('─'.repeat(50));
    for (const r of results) {
      console.log(
        `${r.rooms.toString().padStart(5)} | ${r.chars.toString().padStart(10)} | ${r.lines.toString().padStart(5)} | ${r.parseMs.toFixed(2).padStart(10)}ms`,
      );
    }
    console.log('─'.repeat(50));

    // All should be under threshold
    for (const r of results) {
      if (r.rooms <= 50) {
        expect(r.parseMs).toBeLessThan(500);
      }
    }
  });
});
