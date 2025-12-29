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
    position?: number;
    swing?: string;
    opensInto?: string;
}

