export interface JsonConfig {
    // Wall dimensions
    wall_thickness?: number;
    default_height?: number;
    floor_thickness?: number;
    // Door dimensions (legacy individual properties)
    door_width?: number;
    door_height?: number;
    // Door size as [width, height] (preferred)
    door_size?: [number, number];
    // Window dimensions (legacy individual properties)
    window_width?: number;
    window_height?: number;
    // Window size as [width, height] (preferred)
    window_size?: [number, number];
    window_sill?: number;
    // Style defaults
    default_style?: string;
    // Unit settings
    default_unit?: string;
    area_unit?: string;
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
    isPercentage?: boolean;
    swing?: string;
    opensInto?: string;
    /** Connection-specific width override */
    width?: number;
    /** Connection-specific height override (undefined if fullHeight is true) */
    height?: number;
    /** If true, the opening extends to the ceiling */
    fullHeight?: boolean;
}

