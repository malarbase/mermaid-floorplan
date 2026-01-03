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
    verticalConnections?: JsonVerticalConnection[];
    config?: JsonConfig;
    styles?: JsonStyle[];
}

export interface JsonFloor {
    id: string;
    index: number;
    rooms: JsonRoom[];
    stairs?: JsonStair[];
    lifts?: JsonLift[];
    height?: number;  // Floor-level default height
}

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

