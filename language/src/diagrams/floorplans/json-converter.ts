/**
 * Shared DSL to JSON conversion logic.
 * Single source of truth for converting parsed Floorplan AST to JSON export format.
 * Used by both the CLI export script and the browser-based viewer.
 */

import type { 
    Floorplan, LENGTH_UNIT, AREA_UNIT,
    StairShape, StairSegment
} from "../../generated/ast.js";
import { 
    isStraightStair, isLShapedStair, isUShapedStair, isDoubleLStair,
    isSpiralStair, isCurvedStair, isWinderStair, isSegmentedStair,
    isFlightSegment, isTurnSegment
} from "../../generated/ast.js";
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
    /** Building code for stair validation */
    stair_code?: 'residential' | 'commercial' | 'ada' | 'none';
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
    stairs: JsonStair[];
    lifts: JsonLift[];
    index: number;
    height?: number;
    /** Computed metrics for this floor */
    metrics?: FloorMetrics;
}

// ============================================================================
// Stair and Lift JSON Types
// ============================================================================

export type JsonStairShapeType = 'straight' | 'L-shaped' | 'U-shaped' | 'double-L' | 'spiral' | 'curved' | 'winder' | 'custom';

export interface JsonStairShape {
    type: JsonStairShapeType;
    /** For straight stairs: climb direction */
    direction?: 'north' | 'south' | 'east' | 'west';
    /** For turned stairs: entry direction */
    entry?: 'north' | 'south' | 'east' | 'west';
    /** For turned stairs: turn direction */
    turn?: 'left' | 'right';
    /** For spiral/curved: rotation direction */
    rotation?: 'clockwise' | 'counterclockwise';
    /** Step counts per run (for preset shapes) */
    runs?: number[];
    /** Landing dimensions [width, height] */
    landing?: [number, number];
    /** For spiral stairs: outer radius */
    outerRadius?: number;
    /** For spiral stairs: inner radius */
    innerRadius?: number;
    /** For curved stairs: arc angle in degrees */
    arc?: number;
    /** For curved stairs: curve radius */
    radius?: number;
    /** For winder stairs: number of winder treads */
    winders?: number;
    /** For segmented/custom stairs: flight/turn segments */
    segments?: JsonStairSegment[];
}

export interface JsonStairSegment {
    type: 'flight' | 'turn';
    /** For flight segments: number of steps */
    steps?: number;
    /** For flight segments: optional width override */
    width?: number;
    /** For flight segments: wall alignment reference */
    wallRef?: { room: string; wall: string };
    /** For turn segments: direction */
    direction?: 'left' | 'right';
    /** For turn segments with landing: dimensions [width, height] */
    landing?: [number, number];
    /** For turn segments with winders: count */
    winders?: number;
    /** For turn segments: angle in degrees (90 or 180) */
    angle?: number;
}

export interface JsonStair {
    name: string;
    x: number;
    z: number;
    shape: JsonStairShape;
    /** Total vertical rise */
    rise: number;
    /** Stair width */
    width?: number;
    /** Individual riser height */
    riser?: number;
    /** Individual tread depth */
    tread?: number;
    /** Tread nosing overhang */
    nosing?: number;
    /** Minimum headroom clearance */
    headroom?: number;
    /** Handrail configuration */
    handrail?: 'left' | 'right' | 'both' | 'inner' | 'outer' | 'none';
    /** Stringer style */
    stringers?: 'open' | 'closed' | 'glass';
    /** Material specifications */
    material?: { [key: string]: string };
    label?: string;
    style?: string;
}

export interface JsonLift {
    name: string;
    x: number;
    z: number;
    width: number;
    height: number;
    /** Door directions */
    doors: Array<'north' | 'south' | 'east' | 'west'>;
    label?: string;
    style?: string;
}

export interface JsonVerticalConnection {
    /** Chain of floor.element references */
    links: Array<{ floor: string; element: string }>;
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
    verticalConnections: JsonVerticalConnection[];
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
        verticalConnections: [],
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
            // Handle stair_code property
            if ((normalizedName === 'stairCode' || prop.name === 'stair_code') && prop.stairCodeRef) {
                config.stair_code = prop.stairCodeRef as 'residential' | 'commercial' | 'ada' | 'none';
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
            stairs: [],
            lifts: [],
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

        // Process stairs
        for (const stair of floor.stairs) {
            const stairPos = stair.position 
                ? { x: stair.position.x.value, y: stair.position.y.value }
                : { x: 0, y: 0 }; // TODO: resolve relative positions

            const jsonStair: JsonStair = {
                name: stair.name,
                x: stairPos.x,
                z: stairPos.y,
                shape: convertStairShape(stair.shape),
                rise: stair.rise.value,
                width: stair.width?.value,
                riser: stair.riser?.value,
                tread: stair.tread?.value,
                nosing: stair.nosing?.value,
                headroom: stair.headroom?.value,
                handrail: stair.handrail,
                stringers: stair.stringers,
                material: stair.material ? convertStairMaterial(stair.material) : undefined,
                label: stair.label,
                style: stair.styleRef
            };
            jsonFloor.stairs.push(jsonStair);
        }

        // Process lifts
        for (const lift of floor.lifts) {
            const liftPos = lift.position 
                ? { x: lift.position.x.value, y: lift.position.y.value }
                : { x: 0, y: 0 }; // TODO: resolve relative positions

            const jsonLift: JsonLift = {
                name: lift.name,
                x: liftPos.x,
                z: liftPos.y,
                width: lift.size.width.value,
                height: lift.size.height.value,
                doors: lift.doors as Array<'north' | 'south' | 'east' | 'west'>,
                label: lift.label,
                style: lift.styleRef
            };
            jsonFloor.lifts.push(jsonLift);
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

    // Process vertical connections
    for (const vc of floorplan.verticalConnections) {
        const jsonVC: JsonVerticalConnection = {
            links: vc.links.map(link => ({
                floor: link.floor,
                element: link.element
            }))
        };
        jsonExport.verticalConnections.push(jsonVC);
    }
    
    // Compute floorplan summary
    jsonExport.summary = computeFloorplanSummary(jsonExport.floors);

    return { data: jsonExport, errors };
}

// ============================================================================
// Stair Shape Conversion Helpers
// ============================================================================

/**
 * Convert a StairShape AST node to JsonStairShape
 */
function convertStairShape(shape: StairShape): JsonStairShape {
    if (isStraightStair(shape)) {
        return {
            type: 'straight',
            direction: shape.direction as 'north' | 'south' | 'east' | 'west'
        };
    }
    if (isLShapedStair(shape)) {
        return {
            type: 'L-shaped',
            entry: shape.entry as 'north' | 'south' | 'east' | 'west',
            turn: shape.turn as 'left' | 'right',
            runs: shape.runs.length > 0 ? shape.runs : undefined,
            landing: shape.landing 
                ? [shape.landing.width.value, shape.landing.height.value] 
                : undefined
        };
    }
    if (isUShapedStair(shape)) {
        return {
            type: 'U-shaped',
            entry: shape.entry as 'north' | 'south' | 'east' | 'west',
            turn: shape.turn as 'left' | 'right',
            runs: shape.runs.length > 0 ? shape.runs : undefined,
            landing: shape.landing 
                ? [shape.landing.width.value, shape.landing.height.value] 
                : undefined
        };
    }
    if (isDoubleLStair(shape)) {
        return {
            type: 'double-L',
            entry: shape.entry as 'north' | 'south' | 'east' | 'west',
            turn: shape.turn as 'left' | 'right',
            runs: shape.runs.length > 0 ? shape.runs : undefined,
            landing: shape.landing 
                ? [shape.landing.width.value, shape.landing.height.value] 
                : undefined
        };
    }
    if (isSpiralStair(shape)) {
        return {
            type: 'spiral',
            rotation: shape.rotation as 'clockwise' | 'counterclockwise',
            outerRadius: shape.outerRadius.value,
            innerRadius: shape.innerRadius?.value
        };
    }
    if (isCurvedStair(shape)) {
        return {
            type: 'curved',
            entry: shape.entry as 'north' | 'south' | 'east' | 'west',
            arc: shape.arc,
            radius: shape.radius.value
        };
    }
    if (isWinderStair(shape)) {
        return {
            type: 'winder',
            entry: shape.entry as 'north' | 'south' | 'east' | 'west',
            turn: shape.turn as 'left' | 'right',
            winders: shape.winders,
            runs: shape.runs.length > 0 ? shape.runs : undefined
        };
    }
    if (isSegmentedStair(shape)) {
        return {
            type: 'custom',
            entry: shape.entry as 'north' | 'south' | 'east' | 'west',
            segments: shape.segments.map(convertStairSegment)
        };
    }
    // Fallback - should not happen
    return { type: 'straight' };
}

/**
 * Convert a StairSegment AST node to JsonStairSegment
 */
function convertStairSegment(segment: StairSegment): JsonStairSegment {
    if (isFlightSegment(segment)) {
        return {
            type: 'flight',
            steps: segment.steps,
            width: segment.width?.value,
            wallRef: segment.wallRef 
                ? { room: segment.wallRef.room, wall: segment.wallRef.wall }
                : undefined
        };
    }
    if (isTurnSegment(segment)) {
        return {
            type: 'turn',
            direction: segment.direction as 'left' | 'right',
            landing: segment.landing 
                ? [segment.landing.width.value, segment.landing.height.value]
                : undefined,
            winders: segment.winders,
            angle: segment.angle
        };
    }
    // Fallback
    return { type: 'flight', steps: 0 };
}

/**
 * Convert StairMaterial AST node to a simple key-value object
 */
function convertStairMaterial(material: { properties: Array<{ name: string; value: string }> }): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    for (const prop of material.properties) {
        result[prop.name] = prop.value.replace(/^["']|["']$/g, '');
    }
    return result;
}

