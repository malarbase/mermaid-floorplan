/**
 * Script to export floorplan DSL to JSON for 3D viewing
 * Usage: npx tsx scripts/export-json.ts <input.floorplan> [output.json]
 */

import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import type { Floorplan, Floor, Room, Connection } from "floorplans-language";
import { createFloorplansServices, resolveFloorPositions } from "floorplans-language";
import * as fs from "fs";
import * as path from "path";

// Define JSON output types
export interface JsonExport {
    floors: JsonFloor[];
    connections: JsonConnection[];
}

export interface JsonFloor {
    id: string;
    rooms: JsonRoom[];
    index: number;
}

export interface JsonRoom {
    name: string;
    label: string | undefined;
    x: number;
    z: number; // 2D y -> 3D z
    width: number;
    height: number; // 2D height -> 3D depth
    walls: JsonWall[];
}

export interface JsonWall {
    direction: "top" | "bottom" | "left" | "right";
    type: "solid" | "open" | "door" | "window";
}

export interface JsonConnection {
    fromRoom: string;
    fromWall: string;
    toRoom: string;
    toWall: string;
    doorType: string;
    position?: number; // Percentage 0-100
    swing?: string;
    opensInto?: string;
}

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

    const floorplan = doc.parseResult.value;
    const jsonExport: JsonExport = {
        floors: [],
        connections: []
    };

    // Process floors
    for (let i = 0; i < floorplan.floors.length; i++) {
        const floor = floorplan.floors[i];
        const resolution = resolveFloorPositions(floor);
        
        if (resolution.errors.length > 0) {
            console.error(`Error resolving positions for floor ${floor.id}:`);
            for (const error of resolution.errors) {
                console.error(`  - ${error.message}`);
            }
            continue; // Skip valid export if positions are broken
        }

        const jsonFloor: JsonFloor = {
            id: floor.id,
            index: i,
            rooms: []
        };

        for (const room of floor.rooms) {
            const pos = resolution.positions.get(room.name);
            if (!pos) continue;

            // Map walls
            const walls: JsonWall[] = [];
            if (room.walls && room.walls.specifications) {
                for (const spec of room.walls.specifications) {
                    walls.push({
                        direction: spec.direction,
                        type: spec.type
                    });
                }
            }

            // Fill in missing walls as solid by default if not specified (implicit rule usually, but explicit in DSL? 
            // The DSL usually specifies walls. If not, we might assume solid or open? 
            // In the renderer, it seems we check if a wall exists. 
            // Let's stick to what's defined in specs.)
            // Actually, the renderer `wallRectangle` logic might imply defaults.
            // But let's export what we have. 

            jsonFloor.rooms.push({
                name: room.name,
                label: room.label,
                x: pos.x,
                z: pos.y, // Map 2D Y to 3D Z
                width: room.size.width,
                height: room.size.height,
                walls: walls
            });
        }

        jsonExport.floors.push(jsonFloor);
    }

    // Process connections
    for (const conn of floorplan.connections) {
        // Resolve room references
        const fromRoomName = conn.from.room.name;
        const toRoomName = conn.to.room.name;
        
        if (!fromRoomName || !toRoomName) continue;

        jsonExport.connections.push({
            fromRoom: fromRoomName,
            fromWall: conn.from.wall || "unknown",
            toRoom: toRoomName,
            toWall: conn.to.wall || "unknown",
            doorType: conn.doorType,
            position: conn.position,
            swing: conn.swing,
            opensInto: conn.opensInto?.name
        });
    }

    fs.writeFileSync(outputPath, JSON.stringify(jsonExport, null, 2));
    console.log(`Exported JSON to ${outputPath}`);
}

main().catch(console.error);

