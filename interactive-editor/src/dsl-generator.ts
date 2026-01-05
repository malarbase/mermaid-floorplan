/**
 * DSL Text Generator - Generate floorplan DSL code snippets.
 * 
 * Used by the properties panel to:
 * - Generate new room definitions
 * - Generate connection statements
 * - Format property updates
 */

/**
 * Options for generating a room definition.
 */
export interface RoomGeneratorOptions {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  walls?: {
    top?: 'solid' | 'open' | 'door' | 'window';
    bottom?: 'solid' | 'open' | 'door' | 'window';
    left?: 'solid' | 'open' | 'door' | 'window';
    right?: 'solid' | 'open' | 'door' | 'window';
  };
  style?: string;
  roomHeight?: number;
  elevation?: number;
}

/**
 * Options for generating a connection statement.
 */
export interface ConnectionGeneratorOptions {
  fromRoom: string;
  fromWall: 'top' | 'bottom' | 'left' | 'right';
  toRoom: string;
  toWall: 'top' | 'bottom' | 'left' | 'right';
  type: 'door' | 'double-door' | 'window' | 'opening';
  position?: number;  // Percentage (0-100)
  width?: number;
  height?: number;
  swing?: 'left' | 'right';
  opensInto?: string;
}

/**
 * Options for generating a floor definition.
 */
export interface FloorGeneratorOptions {
  id: string;
  height?: number;
}

/**
 * DSL code generator for floorplan elements.
 */
export class DslGenerator {
  private indentChar: string;
  private indentSize: number;

  constructor(options: { indentChar?: string; indentSize?: number } = {}) {
    this.indentChar = options.indentChar ?? ' ';
    this.indentSize = options.indentSize ?? 2;
  }

  /**
   * Generate indentation string.
   */
  private indent(level: number): string {
    return this.indentChar.repeat(this.indentSize * level);
  }

  /**
   * Generate a room definition.
   * 
   * @param options - Room options
   * @param indentLevel - Base indentation level (default: 2 for inside floor block)
   * @returns DSL code for the room
   */
  generateRoom(options: RoomGeneratorOptions, indentLevel = 2): string {
    const indent = this.indent(indentLevel);
    const parts: string[] = [];

    // Room header: room Name at (x, y) size (w x h)
    parts.push(`${indent}room ${options.name} at (${options.x}, ${options.y}) size (${options.width} x ${options.height})`);

    // Room height if specified
    if (options.roomHeight !== undefined) {
      parts[0] += ` height ${options.roomHeight}`;
    }

    // Elevation if specified
    if (options.elevation !== undefined) {
      parts[0] += ` elevation ${options.elevation}`;
    }

    // Style reference if specified
    if (options.style) {
      parts[0] += ` style ${options.style}`;
    }

    // Walls specification
    const walls = options.walls ?? { top: 'solid', bottom: 'solid', left: 'solid', right: 'solid' };
    const wallSpecs: string[] = [];
    
    if (walls.top) wallSpecs.push(`top: ${walls.top}`);
    if (walls.right) wallSpecs.push(`right: ${walls.right}`);
    if (walls.bottom) wallSpecs.push(`bottom: ${walls.bottom}`);
    if (walls.left) wallSpecs.push(`left: ${walls.left}`);

    if (wallSpecs.length > 0) {
      parts[0] += ` walls [${wallSpecs.join(', ')}]`;
    }

    return parts.join('\n');
  }

  /**
   * Generate a connection statement.
   * 
   * @param options - Connection options
   * @param indentLevel - Base indentation level (default: 1 for top-level)
   * @returns DSL code for the connection
   */
  generateConnection(options: ConnectionGeneratorOptions, indentLevel = 1): string {
    const indent = this.indent(indentLevel);
    const parts: string[] = [];

    // connect FromRoom.wall to ToRoom.wall type
    let line = `${indent}connect ${options.fromRoom}.${options.fromWall} to ${options.toRoom}.${options.toWall}`;
    
    // Connection type
    line += ` ${options.type}`;

    // Position percentage
    if (options.position !== undefined) {
      line += ` at ${options.position}%`;
    }

    // Size specifications
    if (options.width !== undefined || options.height !== undefined) {
      const sizeParts: string[] = [];
      if (options.width !== undefined) sizeParts.push(`width ${options.width}`);
      if (options.height !== undefined) sizeParts.push(`height ${options.height}`);
      line += ` ${sizeParts.join(' ')}`;
    }

    // Swing direction (for doors)
    if (options.swing) {
      line += ` swing ${options.swing}`;
    }

    // Opens into room (for doors)
    if (options.opensInto) {
      line += ` opens into ${options.opensInto}`;
    }

    parts.push(line);
    return parts.join('\n');
  }

  /**
   * Generate a floor block header.
   * 
   * @param options - Floor options
   * @param indentLevel - Base indentation level (default: 1)
   * @returns DSL code for the floor header (without closing brace)
   */
  generateFloorHeader(options: FloorGeneratorOptions, indentLevel = 1): string {
    const indent = this.indent(indentLevel);
    let line = `${indent}floor ${options.id}`;
    
    if (options.height !== undefined) {
      line += ` height ${options.height}`;
    }
    
    line += ' {';
    return line;
  }

  /**
   * Generate a closing brace for a block.
   * 
   * @param indentLevel - Indentation level
   * @returns Closing brace with proper indentation
   */
  generateBlockClose(indentLevel = 1): string {
    return `${this.indent(indentLevel)}}`;
  }

  /**
   * Generate a complete room definition with proper formatting.
   * Useful for inserting a new room into an existing floor.
   * 
   * @param options - Room options
   * @returns Complete room DSL with newlines
   */
  generateRoomBlock(options: RoomGeneratorOptions): string {
    return this.generateRoom(options);
  }

  /**
   * Generate a property update for a room.
   * Returns the new value that should replace the old one.
   * 
   * @param property - Property name (e.g., 'width', 'x', 'style')
   * @param value - New value
   * @returns Formatted value string
   */
  formatPropertyValue(property: string, value: unknown): string {
    switch (property) {
      case 'name':
      case 'style':
      case 'floor':
        return String(value);
      case 'x':
      case 'y':
      case 'width':
      case 'height':
      case 'roomHeight':
      case 'elevation':
        return typeof value === 'number' ? String(value) : String(value);
      default:
        return String(value);
    }
  }

  /**
   * Generate default room options with sensible defaults.
   */
  static defaultRoomOptions(name: string): RoomGeneratorOptions {
    return {
      name,
      x: 0,
      y: 0,
      width: 4,
      height: 4,
      walls: {
        top: 'solid',
        bottom: 'solid',
        left: 'solid',
        right: 'solid',
      },
    };
  }

  /**
   * Generate default connection options.
   */
  static defaultConnectionOptions(
    fromRoom: string,
    toRoom: string
  ): ConnectionGeneratorOptions {
    return {
      fromRoom,
      fromWall: 'right',
      toRoom,
      toWall: 'left',
      type: 'door',
      position: 50,
    };
  }
}

/**
 * Singleton instance with default settings.
 */
export const dslGenerator = new DslGenerator();

