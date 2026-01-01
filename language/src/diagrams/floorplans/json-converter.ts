/**
 * Shared DSL to JSON conversion logic.
 * Single source of truth for converting parsed Floorplan AST to JSON export format.
 * Used by both the CLI export script and the browser-based viewer.
 */

import type { Floorplan, LENGTH_UNIT, AREA_UNIT } from "../../generated/ast.js";
import { resolveFloorPositions } from "./position-resolver.js";
import { resolveVariables, getRoomSize } from "./variable-resolver.js";
import {
    computeRoomMetrics,
    computeFloorMetrics,
    computeFloorplanSummary,
    type FloorMetrics,
    type FloorplanSummary,
} from "./metrics.js";
import { normalizeConfigKey } from "./styles.js";
import { extractVersionFromAST, CURRENT_VERSION } from "./version-resolver.js";

// ============================================================================
// JSON Export Types
// ============================================================================

export interface JsonConfig {
    wall_thickness?: number;
    default_height?: number;
    floor_thickness?: number;
    /** Door width (legacy, use door_size instead) */
    door_width?: number;
    /** Door height (legacy, use door_size instead) */
    door_height?: number;
    /** Door size as [width, height] */
    door_size?: [number, number];
    /** Window width (legacy, use window_size instead) */
    window_width?: number;
    /** Window height (legacy, use window_size instead) */
    window_height?: number;
    /** Window size as [width, height] */
    window_size?: [number, number];
    window_sill?: number;
    default_style?: string;
    default_unit?: LENGTH_UNIT;
    area_unit?: AREA_UNIT;
    // Theme and display properties (Mermaid-aligned)
    /** Theme name: 'default', 'dark', or 'blueprint' */
    theme?: string;
    /** Dark mode toggle (alternative to theme: 'dark') */
    darkMode?: boolean;
    /** Font family for labels */
    fontFamily?: string;
    /** Font size for labels */
    fontSize?: number;
    /** Whether to show room labels */
    showLabels?: boolean;
    /** Whether to show dimension annotations */
    showDimensions?: boolean;
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
    /** Connection-specific width override */
    width?: number;
    /** Connection-specific height override (undefined if fullHeight is true) */
    height?: number;
    /** If true, the opening extends to the ceiling */
    fullHeight?: boolean;
}

export interface JsonExport {
    /** Grammar version used to parse the floorplan */
    grammarVersion: string;
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

    // Extract grammar version from floorplan (or use current version as default)
    const grammarVersion = extractVersionFromAST(floorplan) || CURRENT_VERSION;

    const jsonExport: JsonExport = {
        grammarVersion,
        floors: [],
        connections: [],
        styles: []
    };

    // Process config
    if (floorplan.config) {
        const config: JsonConfig = {};
        for (const prop of floorplan.config.properties) {
            // Normalize property name to camelCase for matching
            const normalizedName = normalizeConfigKey(prop.name);
            
            // Handle numeric values - use original key name for backward compatibility
            if (prop.value !== undefined) {
                (config as Record<string, number>)[prop.name] = prop.value;
            }
            // Handle dimension properties (door_size, window_size)
            if (prop.dimension !== undefined) {
                if (normalizedName === 'doorSize') {
                    config.door_size = [prop.dimension.width.value, prop.dimension.height.value];
                } else if (normalizedName === 'windowSize') {
                    config.window_size = [prop.dimension.width.value, prop.dimension.height.value];
                }
            }
            // Handle default_unit
            if ((normalizedName === 'defaultUnit') && prop.unitRef) {
                config.default_unit = prop.unitRef;
            }
            // Handle default_style
            if ((normalizedName === 'defaultStyle') && prop.styleRef) {
                config.default_style = prop.styleRef;
            }
            // Handle area_unit
            if ((normalizedName === 'areaUnit') && prop.areaUnitRef) {
                config.area_unit = prop.areaUnitRef;
            }
            // Handle theme property
            if ((normalizedName === 'theme') && prop.themeRef) {
                config.theme = prop.themeRef;
            }
            // Handle boolean properties (darkMode, showLabels, showDimensions)
            if (prop.boolValue !== undefined) {
                // Use camelCase for new boolean properties
                (config as Record<string, boolean>)[normalizedName] = prop.boolValue === 'true';
            }
            // Handle string properties (fontFamily)
            if (prop.stringValue !== undefined && normalizedName === 'fontFamily') {
                config.fontFamily = prop.stringValue.replace(/^["']|["']$/g, '');
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

        const jsonConn: JsonConnection = {
            fromRoom: fromRoomName,
            fromWall: conn.from.wall || "unknown",
            toRoom: toRoomName,
            toWall: conn.to.wall || "unknown",
            doorType: conn.doorType,
            position: conn.position,
            swing: conn.swing,
            opensInto: conn.opensInto?.name
        };

        // Add size if specified
        if (conn.size) {
            jsonConn.width = conn.size.width.value;
            if (conn.size.fullHeight) {
                jsonConn.fullHeight = true;
            } else if (conn.size.height) {
                jsonConn.height = conn.size.height.value;
            }
        }

        jsonExport.connections.push(jsonConn);
    }
    
    // Compute floorplan summary
    jsonExport.summary = computeFloorplanSummary(jsonExport.floors);

    return { data: jsonExport, errors };
}

