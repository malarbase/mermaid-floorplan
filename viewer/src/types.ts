export interface JsonConfig {
    // Wall dimensions
    wall_thickness?: number;
    default_height?: number;
    floor_thickness?: number;
    // Door dimensions
    door_width?: number;
    door_height?: number;
    // Window dimensions
    window_width?: number;
    window_height?: number;
    window_sill?: number;
    // Style defaults
    default_style?: string;
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

export interface JsonExport {
    floors: JsonFloor[];
    connections: JsonConnection[];
    config?: JsonConfig;
    styles?: JsonStyle[];
}

export interface JsonFloor {
    id: string;
    index: number;
    rooms: JsonRoom[];
    height?: number;  // Floor-level default height
}

export interface JsonRoom {
    name: string;
    label?: string;
    x: number;
    z: number;
    width: number;
    height: number;
    walls: JsonWall[];
    roomHeight?: number;
    elevation?: number;
    style?: string;
}

export interface JsonWall {
    direction: "top" | "bottom" | "left" | "right";
    type: "solid" | "open" | "door" | "window";
    position?: number;
    isPercentage?: boolean;
    width?: number; // Window/Door width
    height?: number; // Window/Door height
    wallHeight?: number; // Wall height override
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

