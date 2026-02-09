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
  position?: number; // Percentage (0-100)
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
    parts.push(
      `${indent}room ${options.name} at (${options.x}, ${options.y}) size (${options.width} x ${options.height})`,
    );

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
  static defaultConnectionOptions(fromRoom: string, toRoom: string): ConnectionGeneratorOptions {
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

/**
 * Property edit operation for Monaco editor.
 */
export interface DslEditOperation {
  /** Range to replace (Monaco 1-indexed) */
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  /** New text to insert */
  text: string;
}

/**
 * Source range (0-indexed, from Langium).
 */
interface SourceRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

/**
 * DslPropertyEditor - Generates Monaco edit operations for DSL property changes.
 *
 * Given an entity's source range and the property to change, finds the exact
 * location in the DSL text and creates a targeted edit operation.
 */
export class DslPropertyEditor {
  /**
   * Generate a Monaco edit operation for changing a room property.
   *
   * @param sourceText - The full DSL document text
   * @param sourceRange - The entity's source range (0-indexed)
   * @param property - Property name to edit
   * @param newValue - New property value
   * @returns Edit operation, or null if property not found
   */
  generateRoomPropertyEdit(
    sourceText: string,
    sourceRange: SourceRange,
    property: string,
    newValue: unknown,
  ): DslEditOperation | null {
    // Get the entity's source text
    const lines = sourceText.split('\n');
    const entityText = this.extractRangeText(lines, sourceRange);

    // Find the property location within the entity text
    const propertyLocation = this.findPropertyInRoomText(entityText, property);
    if (!propertyLocation) {
      console.warn(`[DslPropertyEditor] Property '${property}' not found in room definition`);
      return null;
    }

    // Calculate absolute position in document
    const absoluteRange = this.relativeToAbsolute(sourceRange, propertyLocation);

    // Format the new value
    const newText = this.formatValue(property, newValue);

    return {
      range: {
        startLineNumber: absoluteRange.startLine + 1, // Monaco is 1-indexed
        startColumn: absoluteRange.startColumn + 1,
        endLineNumber: absoluteRange.endLine + 1,
        endColumn: absoluteRange.endColumn + 1,
      },
      text: newText,
    };
  }

  /**
   * Generate a Monaco edit operation for changing a connection property.
   */
  generateConnectionPropertyEdit(
    sourceText: string,
    sourceRange: SourceRange,
    property: string,
    newValue: unknown,
  ): DslEditOperation | null {
    const lines = sourceText.split('\n');
    const entityText = this.extractRangeText(lines, sourceRange);

    const propertyLocation = this.findPropertyInConnectionText(entityText, property);
    if (!propertyLocation) {
      console.warn(`[DslPropertyEditor] Property '${property}' not found in connection definition`);
      return null;
    }

    const absoluteRange = this.relativeToAbsolute(sourceRange, propertyLocation);
    const newText = this.formatValue(property, newValue);

    return {
      range: {
        startLineNumber: absoluteRange.startLine + 1,
        startColumn: absoluteRange.startColumn + 1,
        endLineNumber: absoluteRange.endLine + 1,
        endColumn: absoluteRange.endColumn + 1,
      },
      text: newText,
    };
  }

  /**
   * Extract text from a source range.
   */
  private extractRangeText(lines: string[], range: SourceRange): string {
    if (range.startLine === range.endLine) {
      return lines[range.startLine]?.substring(range.startColumn, range.endColumn) ?? '';
    }

    const result: string[] = [];
    for (let i = range.startLine; i <= range.endLine; i++) {
      if (i === range.startLine) {
        result.push(lines[i]?.substring(range.startColumn) ?? '');
      } else if (i === range.endLine) {
        result.push(lines[i]?.substring(0, range.endColumn) ?? '');
      } else {
        result.push(lines[i] ?? '');
      }
    }
    return result.join('\n');
  }

  /**
   * Find a property's location within room definition text.
   * Returns relative offsets within the entity text.
   */
  private findPropertyInRoomText(
    text: string,
    property: string,
  ): { startLine: number; startColumn: number; endLine: number; endColumn: number } | null {
    // Room definition: room Name at (x, y) size (w x h) [height H] [elevation E] [style S] walls [...]

    switch (property) {
      case 'name': {
        // Find: room NAME at
        const match = text.match(/room\s+(\S+)\s+at/);
        if (match && match.index !== undefined) {
          const nameStart = match.index + 'room '.length;
          const nameEnd = nameStart + match[1].length;
          return this.offsetToLineColumn(text, nameStart, nameEnd);
        }
        break;
      }

      case 'x': {
        // Find: at (X, y)
        const match = text.match(/at\s*\(\s*(-?[\d.]+)\s*,/);
        if (match && match.index !== undefined) {
          const valueStart = text.indexOf(match[1], match.index);
          const valueEnd = valueStart + match[1].length;
          return this.offsetToLineColumn(text, valueStart, valueEnd);
        }
        break;
      }

      case 'y': {
        // Find: at (x, Y)
        const match = text.match(/at\s*\(\s*-?[\d.]+\s*,\s*(-?[\d.]+)\s*\)/);
        if (match && match.index !== undefined) {
          // Find the second number after the comma
          const afterComma = text.indexOf(',', match.index);
          const valueMatch = text.substring(afterComma).match(/,\s*(-?[\d.]+)/);
          if (valueMatch && valueMatch.index !== undefined) {
            const valueStart = afterComma + valueMatch.index + valueMatch[0].indexOf(valueMatch[1]);
            const valueEnd = valueStart + valueMatch[1].length;
            return this.offsetToLineColumn(text, valueStart, valueEnd);
          }
        }
        break;
      }

      case 'width': {
        // Find: size (W x h)
        const match = text.match(/size\s*\(\s*(-?[\d.]+)\s*x/i);
        if (match && match.index !== undefined) {
          const valueStart = text.indexOf(match[1], match.index);
          const valueEnd = valueStart + match[1].length;
          return this.offsetToLineColumn(text, valueStart, valueEnd);
        }
        break;
      }

      case 'height': {
        // Find: size (w x H) - the second number in size
        const match = text.match(/size\s*\(\s*-?[\d.]+\s*x\s*(-?[\d.]+)\s*\)/i);
        if (match && match.index !== undefined) {
          const afterX = text.indexOf(' x ', match.index);
          if (afterX !== -1) {
            const valueMatch = text.substring(afterX).match(/x\s*(-?[\d.]+)/i);
            if (valueMatch && valueMatch.index !== undefined) {
              const valueStart = afterX + valueMatch.index + valueMatch[0].indexOf(valueMatch[1]);
              const valueEnd = valueStart + valueMatch[1].length;
              return this.offsetToLineColumn(text, valueStart, valueEnd);
            }
          }
        }
        break;
      }

      case 'roomHeight': {
        // Find: height H (after size but before walls)
        const match = text.match(/\)\s+height\s+(-?[\d.]+)/i);
        if (match && match.index !== undefined) {
          const valueStart = text.indexOf(match[1], match.index);
          const valueEnd = valueStart + match[1].length;
          return this.offsetToLineColumn(text, valueStart, valueEnd);
        }
        break;
      }

      case 'style': {
        // Find: style STYLENAME
        const match = text.match(/style\s+(\S+)/);
        if (match && match.index !== undefined) {
          const valueStart = text.indexOf(match[1], match.index);
          const valueEnd = valueStart + match[1].length;
          return this.offsetToLineColumn(text, valueStart, valueEnd);
        }
        break;
      }
    }

    return null;
  }

  /**
   * Generate a Monaco edit operation for changing a wall property.
   * Wall specifications have format: "direction: type [at position%]"
   *
   * @param sourceText - The full DSL document text
   * @param sourceRange - The wall's source range (0-indexed)
   * @param property - Property name to edit ('type')
   * @param newValue - New property value
   * @returns Edit operation, or null if property not found
   */
  generateWallPropertyEdit(
    sourceText: string,
    sourceRange: SourceRange,
    property: string,
    newValue: unknown,
  ): DslEditOperation | null {
    const lines = sourceText.split('\n');
    const entityText = this.extractRangeText(lines, sourceRange);

    const propertyLocation = this.findPropertyInWallText(entityText, property);
    if (!propertyLocation) {
      console.warn(`[DslPropertyEditor] Property '${property}' not found in wall definition`);
      return null;
    }

    const absoluteRange = this.relativeToAbsolute(sourceRange, propertyLocation);
    const newText = this.formatValue(property, newValue);

    return {
      range: {
        startLineNumber: absoluteRange.startLine + 1,
        startColumn: absoluteRange.startColumn + 1,
        endLineNumber: absoluteRange.endLine + 1,
        endColumn: absoluteRange.endColumn + 1,
      },
      text: newText,
    };
  }

  /**
   * Find a property's location within wall specification text.
   * Wall format: "direction: type [at position%]"
   */
  private findPropertyInWallText(
    text: string,
    property: string,
  ): { startLine: number; startColumn: number; endLine: number; endColumn: number } | null {
    switch (property) {
      case 'type': {
        // Wall format: "direction: type" where type is solid|open|door|window
        // Find the type after the colon
        const match = text.match(/:\s*(solid|open|door|window)/);
        if (match && match.index !== undefined) {
          const typeStart = text.indexOf(match[1], match.index);
          const typeEnd = typeStart + match[1].length;
          return this.offsetToLineColumn(text, typeStart, typeEnd);
        }
        break;
      }

      case 'position': {
        // Find: at N%
        const match = text.match(/at\s+(\d+)%/);
        if (match && match.index !== undefined) {
          const valueStart = text.indexOf(match[1], match.index);
          const valueEnd = valueStart + match[1].length;
          return this.offsetToLineColumn(text, valueStart, valueEnd);
        }
        break;
      }
    }

    return null;
  }

  /**
   * Find a property's location within connection definition text.
   */
  private findPropertyInConnectionText(
    text: string,
    property: string,
  ): { startLine: number; startColumn: number; endLine: number; endColumn: number } | null {
    // Connection: connect Room1.wall to Room2.wall type [at position%] [width W] [height H]

    switch (property) {
      case 'type': {
        // Find the connection type (door, double-door, window, opening)
        const match = text.match(/\.(top|bottom|left|right)\s+(door|double-door|window|opening)/);
        if (match && match.index !== undefined) {
          const typeStart = text.indexOf(match[2], match.index);
          const typeEnd = typeStart + match[2].length;
          return this.offsetToLineColumn(text, typeStart, typeEnd);
        }
        break;
      }

      case 'position': {
        // Find: at N%
        const match = text.match(/at\s+(\d+)%/);
        if (match && match.index !== undefined) {
          const valueStart = text.indexOf(match[1], match.index);
          const valueEnd = valueStart + match[1].length;
          return this.offsetToLineColumn(text, valueStart, valueEnd);
        }
        break;
      }
    }

    return null;
  }

  /**
   * Convert character offsets to line/column positions within text.
   */
  private offsetToLineColumn(
    text: string,
    startOffset: number,
    endOffset: number,
  ): { startLine: number; startColumn: number; endLine: number; endColumn: number } {
    let line = 0;
    let column = 0;
    let startLine = 0,
      startColumn = 0;
    let endLine = 0,
      endColumn = 0;

    for (let i = 0; i < text.length; i++) {
      if (i === startOffset) {
        startLine = line;
        startColumn = column;
      }
      if (i === endOffset) {
        endLine = line;
        endColumn = column;
        break;
      }

      if (text[i] === '\n') {
        line++;
        column = 0;
      } else {
        column++;
      }
    }

    // Handle end at text boundary
    if (endOffset >= text.length) {
      endLine = line;
      endColumn = column;
    }

    return { startLine, startColumn, endLine, endColumn };
  }

  /**
   * Convert relative position (within entity) to absolute position (in document).
   */
  private relativeToAbsolute(
    entityRange: SourceRange,
    relativeRange: { startLine: number; startColumn: number; endLine: number; endColumn: number },
  ): SourceRange {
    // Add entity's starting position to relative position
    const startLine = entityRange.startLine + relativeRange.startLine;
    const endLine = entityRange.startLine + relativeRange.endLine;

    // For first line, add entity's start column
    const startColumn =
      relativeRange.startLine === 0
        ? entityRange.startColumn + relativeRange.startColumn
        : relativeRange.startColumn;

    const endColumn =
      relativeRange.endLine === 0
        ? entityRange.startColumn + relativeRange.endColumn
        : relativeRange.endColumn;

    return { startLine, startColumn, endLine, endColumn };
  }

  /**
   * Format a value for DSL insertion.
   */
  private formatValue(_property: string, value: unknown): string {
    // Most properties are simple values - convert to string
    // The _property parameter is available for property-specific formatting if needed
    if (typeof value === 'number') {
      return String(value);
    }
    return String(value);
  }
}

/**
 * Singleton instance.
 */
export const dslPropertyEditor = new DslPropertyEditor();
