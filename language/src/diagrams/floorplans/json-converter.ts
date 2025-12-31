/**
 * Shared DSL to JSON conversion logic.
 * Single source of truth for converting parsed Floorplan AST to JSON export format.
 * Used by both the CLI export script and the browser-based viewer.
 */

import type { Floorplan, LENGTH_UNIT } from "../../generated/ast.js";
import { resolveFloorPositions } from "./position-resolver.js";
import { resolveVariables, getRoomSize } from "./variable-resolver.js";
import { 
    computeRoomMetrics, 
    computeFloorMetrics, 
    computeFloorplanSummary,
    type FloorMetrics,
    type FloorplanSummary,
} from "./metrics.js";

// ============================================================================
// JSON Export Types
// ============================================================================

export interface JsonConfig {
    wall_thickness?: number;
    default_height?: number;
    floor_thickness?: number;
    door_width?: number;
    door_height?: number;
    window_width?: number;
    window_height?: number;
    window_sill?: number;
    default_style?: string;
    default_unit?: LENGTH_UNIT;
}

export interface JsonStyle {
    name: string;
    floor_color?: string;
    wall_color?: string;
    floor_texture?: string;
    wall_texture?: string;
    roughness?: number;
    metalness?: number;
}

export interface JsonWall {
    direction: "top" | "bottom" | "left" | "right";
    type: string;
    position?: number;
    isPercentage?: boolean;
    width?: number;
    height?: number;
    wallHeight?: number;
}

export interface JsonRoom {
    name: string;
    label: string | undefined;
    x: number;
    z: number;
    width: number;
    height: number;
    walls: JsonWall[];
    roomHeight?: number;
    elevation?: number;
    style?: string;
    /** Room area (width × height) */
    area?: number;
    /** Room volume (area × roomHeight), computed when roomHeight is specified */
    volume?: number;
}

export interface JsonFloor {
    id: string;
    rooms: JsonRoom[];
    index: number;
    height?: number;
    /** Computed metrics for this floor */
    metrics?: FloorMetrics;
}

export interface JsonConnection {
    fromRoom: string;
    fromWall: string;
    toRoom: string;
    toWall: string;
    doorType: string;
    position?: number;
    swing?: string;
    opensInto?: string;
}

export interface JsonExport {
    floors: JsonFloor[];
    connections: JsonConnection[];
    config?: JsonConfig;
    styles?: JsonStyle[];
    /** Summary metrics for the entire floorplan */
    summary?: FloorplanSummary;
}

// ============================================================================
// Conversion Result Types
// ============================================================================

export interface ConversionError {
    message: string;
    floor?: string;
}

export interface ConversionResult {
    data: JsonExport | null;
    errors: ConversionError[];
}

// ============================================================================
// Conversion Logic
// ============================================================================

/**
 * Convert a parsed Floorplan AST to JSON export format.
 * This is the single source of truth for DSL → JSON conversion.
 */
export function convertFloorplanToJson(floorplan: Floorplan): ConversionResult {
    const errors: ConversionError[] = [];
    const variableResolution = resolveVariables(floorplan);
    const variables = variableResolution.variables;

    const jsonExport: JsonExport = {
        floors: [],
        connections: [],
        styles: []
    };

    // Process config
    if (floorplan.config) {
        const config: JsonConfig = {};
        for (const prop of floorplan.config.properties) {
            if (prop.value !== undefined) {
                (config as Record<string, number>)[prop.name] = prop.value;
            }
            // Handle default_unit
            if (prop.name === 'default_unit' && prop.unitRef) {
                config.default_unit = prop.unitRef;
            }
            // Handle default_style
            if (prop.name === 'default_style' && prop.styleRef) {
                config.default_style = prop.styleRef;
            }
        }
        if (Object.keys(config).length > 0) {
            jsonExport.config = config;
        }
    }

    // Process styles
    for (const style of floorplan.styles) {
        const jsonStyle: JsonStyle = { name: style.name };
        for (const prop of style.properties) {
            const key = prop.name as keyof Omit<JsonStyle, 'name'>;
            if (prop.stringValue) {
                // Remove quotes from string values
                (jsonStyle as unknown as Record<string, string | number>)[key] = prop.stringValue.replace(/^["']|["']$/g, '');
            } else if (prop.numberValue !== undefined) {
                (jsonStyle as unknown as Record<string, string | number>)[key] = prop.numberValue;
            }
        }
        jsonExport.styles!.push(jsonStyle);
    }

    // Process floors
    for (let i = 0; i < floorplan.floors.length; i++) {
        const floor = floorplan.floors[i];
        const resolution = resolveFloorPositions(floor, variables);

        if (resolution.errors.length > 0) {
            for (const error of resolution.errors) {
                errors.push({ message: error.message, floor: floor.id });
            }
            continue;
        }

        const jsonFloor: JsonFloor = {
            id: floor.id,
            index: i,
            rooms: [],
            height: floor.height?.value
        };

        for (const room of floor.rooms) {
            const pos = resolution.positions.get(room.name);
            if (!pos) continue;

            const resolvedSize = getRoomSize(room, variables);
            const walls: JsonWall[] = [];

            if (room.walls?.specifications) {
                for (const spec of room.walls.specifications) {
                    walls.push({
                        direction: spec.direction as JsonWall['direction'],
                        type: spec.type,
                        position: spec.position,
                        isPercentage: spec.unit === '%',
                        width: spec.size?.width?.value,
                        height: spec.size?.height?.value,
                        wallHeight: spec.height
                    });
                }
            }

            const jsonRoom: JsonRoom = {
                name: room.name,
                label: room.label,
                x: pos.x,
                z: pos.y,
                width: resolvedSize.width,
                height: resolvedSize.height,
                walls,
                roomHeight: room.height?.value,
                elevation: room.elevation ? (room.elevation.negative ? -room.elevation.value : room.elevation.value) : undefined,
                style: room.styleRef
            };
            
            // Compute room metrics
            const roomMetrics = computeRoomMetrics(jsonRoom);
            jsonRoom.area = roomMetrics.area;
            if (roomMetrics.volume !== undefined) {
                jsonRoom.volume = roomMetrics.volume;
            }
            
            jsonFloor.rooms.push(jsonRoom);
        }
        
        // Compute floor metrics
        jsonFloor.metrics = computeFloorMetrics(jsonFloor);

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
    
    // Compute floorplan summary
    jsonExport.summary = computeFloorplanSummary(jsonExport.floors);

    return { data: jsonExport, errors };
}

