export interface JsonExport {
    floors: JsonFloor[];
    connections: JsonConnection[];
}

export interface JsonFloor {
    id: string;
    index: number;
    rooms: JsonRoom[];
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

