/**
 * Browser-compatible DSL parser for floorplan files
 * Converts .floorplan DSL to JSON format for the 3D viewer
 * 
 * This module creates a direct parser without using langium/test
 * which has Node.js-specific dependencies (node:assert)
 */

import { EmptyFileSystem, URI, type LangiumDocument } from "langium";
import type { Floorplan } from "floorplans-language";
import { createFloorplansServices, resolveFloorPositions, resolveVariables, getRoomSize } from "floorplans-language";
import type { JsonExport, JsonFloor, JsonWall } from "./types";

// Initialize Langium services with EmptyFileSystem (browser-compatible)
const services = createFloorplansServices(EmptyFileSystem);

let documentId = 1;

/**
 * Browser-compatible parse function that doesn't use langium/test
 */
async function parseDSL(input: string): Promise<LangiumDocument<Floorplan>> {
    const uri = URI.parse(`file:///floorplan-${documentId++}.fp`);
    const document = services.shared.workspace.LangiumDocumentFactory.fromString<Floorplan>(input, uri);
    services.shared.workspace.LangiumDocuments.addDocument(document);
    await services.shared.workspace.DocumentBuilder.build([document]);
    return document;
}

export interface ParseError {
    message: string;
    line?: number;
    column?: number;
}

export interface ParseResult {
    data: JsonExport | null;
    errors: ParseError[];
}

/**
 * Parse a floorplan DSL string and convert to JSON format
 */
export async function parseFloorplanDSL(dslContent: string): Promise<ParseResult> {
    const errors: ParseError[] = [];

    try {
        const doc = await parseDSL(dslContent);

        // Collect parse errors
        for (const error of doc.parseResult.parserErrors) {
            errors.push({
                message: error.message,
                line: error.token?.startLine,
                column: error.token?.startColumn,
            });
        }

        for (const error of doc.parseResult.lexerErrors) {
            errors.push({
                message: error.message,
                line: error.line,
                column: error.column,
            });
        }

        if (errors.length > 0) {
            return { data: null, errors };
        }

        const floorplan = doc.parseResult.value;
        const jsonExport: JsonExport = {
            floors: [],
            connections: []
        };

        // Resolve variables from the floorplan
        const variableResolution = resolveVariables(floorplan);
        const variables = variableResolution.variables;

        // Process floors
        for (let i = 0; i < floorplan.floors.length; i++) {
            const floor = floorplan.floors[i];
            const resolution = resolveFloorPositions(floor, variables);

            if (resolution.errors.length > 0) {
                for (const error of resolution.errors) {
                    errors.push({
                        message: `Floor ${floor.id}: ${error.message}`,
                    });
                }
                continue;
            }

            const jsonFloor: JsonFloor = {
                id: floor.id,
                index: i,
                rooms: []
            };

            for (const room of floor.rooms) {
                const pos = resolution.positions.get(room.name);
                if (!pos) continue;

                // Get room size (inline or from variable)
                const roomSize = getRoomSize(room, variables);

                // Map walls
                const walls: JsonWall[] = [];
                if (room.walls && room.walls.specifications) {
                    for (const spec of room.walls.specifications) {
                        walls.push({
                            direction: spec.direction as "top" | "bottom" | "left" | "right",
                            type: spec.type as "solid" | "open" | "door" | "window",
                            position: spec.position,
                            isPercentage: spec.unit === '%',
                            width: spec.size?.width,
                            height: spec.size?.height,
                            wallHeight: spec.height
                        });
                    }
                }

                jsonFloor.rooms.push({
                    name: room.name,
                    label: room.label,
                    x: pos.x,
                    z: pos.y, // Map 2D Y to 3D Z
                    width: roomSize.width,
                    height: roomSize.height,
                    walls: walls,
                    roomHeight: room.height,
                    elevation: room.elevation
                });
            }

            jsonExport.floors.push(jsonFloor);
        }

        // Process connections
        for (const conn of floorplan.connections) {
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

        return { data: jsonExport, errors: [] };

    } catch (err) {
        errors.push({
            message: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`
        });
        return { data: null, errors };
    }
}

/**
 * Check if a filename is a floorplan DSL file
 */
export function isFloorplanFile(filename: string): boolean {
    return filename.toLowerCase().endsWith('.floorplan');
}

/**
 * Check if a filename is a JSON file
 */
export function isJsonFile(filename: string): boolean {
    return filename.toLowerCase().endsWith('.json');
}
