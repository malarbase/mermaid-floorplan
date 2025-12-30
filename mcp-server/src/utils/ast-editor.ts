/**
 * AST-based editor for floorplan DSL
 * Uses CST node positions for precise text editing
 */

import type { LangiumDocument, CstNode, LeafCstNode } from "langium";
import { isCompositeCstNode, isLeafCstNode } from "langium";
import type { Floorplan, Room, Floor } from "floorplans-language";

export interface TextEdit {
  offset: number;
  length: number;
  newText: string;
}

export interface RoomParams {
  name: string;
  position?: { x: number; y: number };
  size: { width: number; height: number };
  walls: { top: string; right: string; bottom: string; left: string };
  label?: string;
  relativePosition?: {
    direction: string;
    reference: string;
    gap?: number;
    alignment?: string;
  };
}

/**
 * Editor for making AST-aware edits to floorplan DSL
 */
export class FloorplanAstEditor {
  private edits: TextEdit[] = [];

  constructor(
    private document: LangiumDocument<Floorplan>,
    private originalText: string
  ) {}

  /**
   * Get the floorplan AST
   */
  get floorplan(): Floorplan {
    return this.document.parseResult.value;
  }

  /**
   * Get first floor (convenience method)
   */
  get firstFloor(): Floor | undefined {
    return this.floorplan.floors[0];
  }

  /**
   * Find a room by name across all floors
   */
  findRoom(name: string): Room | undefined {
    for (const floor of this.document.parseResult.value.floors) {
      const room = this.findRoomInFloor(floor, name);
      if (room) return room;
    }
    return undefined;
  }

  /**
   * Find a room in a specific floor (including sub-rooms)
   */
  private findRoomInFloor(floor: Floor, name: string): Room | undefined {
    for (const room of floor.rooms) {
      if (room.name === name) return room;
      // Check sub-rooms
      const subRoom = this.findRoomInRoom(room, name);
      if (subRoom) return subRoom;
    }
    return undefined;
  }

  private findRoomInRoom(room: Room, name: string): Room | undefined {
    for (const subRoom of room.subRooms) {
      if (subRoom.name === name) return subRoom;
      const nested = this.findRoomInRoom(subRoom, name);
      if (nested) return nested;
    }
    return undefined;
  }

  /**
   * Get all rooms across all floors
   */
  getAllRooms(): Room[] {
    const rooms: Room[] = [];
    for (const floor of this.document.parseResult.value.floors) {
      this.collectRooms(floor.rooms, rooms);
    }
    return rooms;
  }

  private collectRooms(roomList: Room[], result: Room[]): void {
    for (const room of roomList) {
      result.push(room);
      this.collectRooms(room.subRooms, result);
    }
  }

  // ==================== ADD ROOM ====================

  /**
   * Add a new room to the first floor
   */
  addRoom(params: RoomParams): boolean {
    const floor = this.firstFloor;
    if (!floor?.$cstNode) return false;

    // Validate: need either position or relativePosition
    if (!params.position && !params.relativePosition) {
      throw new Error("Room must have either 'position' or 'relativePosition'");
    }

    // Find the insertion point (before the closing brace of the floor)
    const floorCst = floor.$cstNode;
    const leafNodes = this.flattenCst(floorCst);
    
    // Find the closing brace
    let closingBraceOffset: number | undefined;
    for (let i = leafNodes.length - 1; i >= 0; i--) {
      if (leafNodes[i].text === "}") {
        closingBraceOffset = leafNodes[i].offset;
        break;
      }
    }

    if (closingBraceOffset === undefined) return false;

    // Walk back from closing brace to find the newline (skip indentation before })
    let insertOffset = closingBraceOffset;
    while (insertOffset > 0 && this.originalText[insertOffset - 1] !== "\n") {
      insertOffset--;
    }

    // Detect indentation from existing rooms or use default
    const indent = this.detectRoomIndentation(floor) || "    ";

    // Build the room line
    const roomLine = this.buildRoomLine(params, indent);

    this.edits.push({
      offset: insertOffset,
      length: 0,
      newText: roomLine + "\n",
    });

    return true;
  }

  private detectRoomIndentation(floor: Floor): string | undefined {
    if (floor.rooms.length > 0 && floor.rooms[0].$cstNode) {
      const firstRoomOffset = floor.rooms[0].$cstNode.offset;
      // Walk backwards to find the start of the line
      let lineStart = firstRoomOffset;
      while (lineStart > 0 && this.originalText[lineStart - 1] !== "\n") {
        lineStart--;
      }
      // Extract just the whitespace (in case there's other content)
      const linePrefix = this.originalText.slice(lineStart, firstRoomOffset);
      // Only return whitespace
      const match = linePrefix.match(/^(\s*)/);
      return match ? match[1] : undefined;
    }
    return undefined;
  }

  private buildRoomLine(params: RoomParams, indent: string): string {
    const { name, position, size, walls, label, relativePosition } = params;

    let line = `${indent}room ${name}`;

    // Add explicit position if provided
    if (position) {
      line += ` at (${position.x},${position.y})`;
    }

    // Add size and walls
    line += ` size (${size.width} x ${size.height}) walls [top: ${walls.top}, right: ${walls.right}, bottom: ${walls.bottom}, left: ${walls.left}]`;

    // Add relative positioning if provided
    if (relativePosition) {
      line += ` ${relativePosition.direction} ${relativePosition.reference}`;
      if (relativePosition.gap !== undefined) {
        line += ` gap ${relativePosition.gap}`;
      }
      if (relativePosition.alignment) {
        line += ` align ${relativePosition.alignment}`;
      }
    }

    // Add label if provided
    if (label) {
      line += ` label "${label}"`;
    }

    return line;
  }

  // ==================== REMOVE ROOM ====================

  /**
   * Remove a room entirely from the DSL
   */
  removeRoom(room: Room): boolean {
    if (!room.$cstNode) return false;

    const roomCst = room.$cstNode;
    let startOffset = roomCst.offset;
    const endOffset = roomCst.end;

    // Include the preceding newline and indentation
    while (startOffset > 0 && this.originalText[startOffset - 1] !== "\n") {
      startOffset--;
    }
    // Include the newline itself if present
    if (startOffset > 0 && this.originalText[startOffset - 1] === "\n") {
      startOffset--;
    }

    this.edits.push({
      offset: startOffset,
      length: endOffset - startOffset,
      newText: "",
    });

    return true;
  }

  // ==================== RESIZE ROOM ====================

  /**
   * Resize a room by updating its size dimensions
   * Note: Only works for rooms with inline size, not variable references (sizeRef)
   */
  resizeRoom(room: Room, width: number, height: number): boolean {
    // Cannot resize rooms that use sizeRef
    if (!room.size || !room.size.$cstNode) return false;

    const sizeCst = room.size.$cstNode;

    // The size CST contains "(WIDTH x HEIGHT)" - we need to replace just the numbers
    // Find the leaf nodes within the size CST
    const leafNodes = this.flattenCst(sizeCst);
    
    // Find the first number (width) and second number (height)
    const numbers: LeafCstNode[] = [];
    for (const leaf of leafNodes) {
      if (/^[0-9.]+$/.test(leaf.text)) {
        numbers.push(leaf);
      }
    }

    if (numbers.length < 2) return false;

    const widthNode = numbers[0];
    const heightNode = numbers[1];

    // Replace height first (later in text), then width
    this.edits.push({
      offset: heightNode.offset,
      length: heightNode.end - heightNode.offset,
      newText: String(height),
    });

    this.edits.push({
      offset: widthNode.offset,
      length: widthNode.end - widthNode.offset,
      newText: String(width),
    });

    return true;
  }

  // ==================== MOVE ROOM ====================

  /**
   * Move a room to a new position (update or add position)
   */
  moveRoom(room: Room, x: number, y: number): boolean {
    if (!room.$cstNode) return false;

    if (room.position) {
      // Update existing position
      return this.updatePosition(room, x, y);
    } else {
      // Add new position (room uses relative positioning only)
      return this.addPosition(room, x, y);
    }
  }

  private updatePosition(room: Room, x: number, y: number): boolean {
    if (!room.position?.$cstNode) return false;

    const posCst = room.position.$cstNode;
    const leafNodes = this.flattenCst(posCst);

    // Find the two numbers (x and y coordinates)
    const numbers: LeafCstNode[] = [];
    for (const leaf of leafNodes) {
      if (/^[0-9.]+$/.test(leaf.text)) {
        numbers.push(leaf);
      }
    }

    if (numbers.length < 2) return false;

    const xNode = numbers[0];
    const yNode = numbers[1];

    // Replace y first (later in text), then x
    this.edits.push({
      offset: yNode.offset,
      length: yNode.end - yNode.offset,
      newText: String(y),
    });

    this.edits.push({
      offset: xNode.offset,
      length: xNode.end - xNode.offset,
      newText: String(x),
    });

    return true;
  }

  private addPosition(room: Room, x: number, y: number): boolean {
    if (!room.$cstNode) return false;

    // Find the room name to insert after
    const roomCst = room.$cstNode;
    const leafNodes = this.flattenCst(roomCst);

    // Find the room name (ID after "room" keyword)
    let nameEndOffset: number | undefined;
    for (let i = 0; i < leafNodes.length; i++) {
      if (leafNodes[i].text === "room" && i + 1 < leafNodes.length) {
        // Next non-hidden token should be the name
        for (let j = i + 1; j < leafNodes.length; j++) {
          if (!leafNodes[j].hidden) {
            nameEndOffset = leafNodes[j].end;
            break;
          }
        }
        break;
      }
    }

    if (nameEndOffset === undefined) return false;

    this.edits.push({
      offset: nameEndOffset,
      length: 0,
      newText: ` at (${x},${y})`,
    });

    return true;
  }

  // ==================== RENAME ROOM ====================

  /**
   * Rename a room
   */
  renameRoom(room: Room, newName: string): boolean {
    if (!room.$cstNode) return false;

    const roomCst = room.$cstNode;
    const leafNodes = this.flattenCst(roomCst);

    // Find the room name (ID after "room" keyword)
    for (let i = 0; i < leafNodes.length; i++) {
      if (leafNodes[i].text === "room") {
        // Next non-hidden token should be the name
        for (let j = i + 1; j < leafNodes.length; j++) {
          if (!leafNodes[j].hidden) {
            const nameNode = leafNodes[j];
            this.edits.push({
              offset: nameNode.offset,
              length: nameNode.end - nameNode.offset,
              newText: newName,
            });
            return true;
          }
        }
      }
    }

    return false;
  }

  // ==================== UPDATE WALLS ====================

  /**
   * Update wall types for a room
   */
  updateWalls(
    room: Room,
    walls: { top?: string; right?: string; bottom?: string; left?: string }
  ): boolean {
    if (!room.walls.$cstNode) return false;

    // Update each wall that's specified
    for (const spec of room.walls.specifications) {
      const newType =
        spec.direction === "top"
          ? walls.top
          : spec.direction === "right"
            ? walls.right
            : spec.direction === "bottom"
              ? walls.bottom
              : spec.direction === "left"
                ? walls.left
                : undefined;

      if (newType && spec.$cstNode) {
        // Find the type token in this spec
        const specLeaves = this.flattenCst(spec.$cstNode);
        for (const leaf of specLeaves) {
          if (["solid", "door", "window", "open"].includes(leaf.text)) {
            this.edits.push({
              offset: leaf.offset,
              length: leaf.end - leaf.offset,
              newText: newType,
            });
            break;
          }
        }
      }
    }

    return true;
  }

  // ==================== ADD/UPDATE LABEL ====================

  /**
   * Add or update a room's label
   */
  updateLabel(room: Room, label: string): boolean {
    if (!room.$cstNode) return false;

    if (room.label) {
      // Update existing label
      return this.replaceLabel(room, label);
    } else {
      // Add new label
      return this.insertLabel(room, label);
    }
  }

  private replaceLabel(room: Room, label: string): boolean {
    if (!room.$cstNode) return false;

    const roomCst = room.$cstNode;
    const leafNodes = this.flattenCst(roomCst);

    // Find the "label" keyword and the following string
    for (let i = 0; i < leafNodes.length; i++) {
      if (leafNodes[i].text === "label") {
        // Find the string token after "label"
        for (let j = i + 1; j < leafNodes.length; j++) {
          const leaf = leafNodes[j];
          if (leaf.text.startsWith('"') || leaf.text.startsWith("'")) {
            this.edits.push({
              offset: leaf.offset,
              length: leaf.end - leaf.offset,
              newText: `"${label}"`,
            });
            return true;
          }
        }
      }
    }

    return false;
  }

  private insertLabel(room: Room, label: string): boolean {
    // Find the end of the room definition (after walls and relative positioning)
    const insertPoint = this.findLabelInsertPoint(room);
    if (insertPoint === undefined) return false;

    this.edits.push({
      offset: insertPoint,
      length: 0,
      newText: ` label "${label}"`,
    });

    return true;
  }

  private findLabelInsertPoint(room: Room): number | undefined {
    if (!room.$cstNode) return undefined;

    // Insert after relative position if present, otherwise after walls
    if (room.relativePosition?.$cstNode) {
      return room.relativePosition.$cstNode.end;
    }

    if (room.walls.$cstNode) {
      return room.walls.$cstNode.end;
    }

    return undefined;
  }

  // ==================== POSITION MANIPULATION ====================

  /**
   * Find the CST span for "at (x,y)" in a room definition
   * Returns the offset and length including the "at" keyword and the coordinate
   */
  findPositionSpan(room: Room): { offset: number; length: number } | undefined {
    if (!room.position || !room.$cstNode) return undefined;

    const roomCst = room.$cstNode;
    if (!isCompositeCstNode(roomCst)) return undefined;

    // Find the "at" keyword in the room's CST children
    const leafNodes = this.flattenCst(roomCst);

    for (let i = 0; i < leafNodes.length; i++) {
      const leaf = leafNodes[i];
      if (isLeafCstNode(leaf) && leaf.text === "at") {
        // Found "at" keyword - now find the closing ")" of the coordinate
        // The coordinate structure is: "at" "(" NUMBER "," NUMBER ")"
        let closeParenEnd = leaf.end;

        // Search forward for the closing paren
        for (let j = i + 1; j < leafNodes.length; j++) {
          const nextLeaf = leafNodes[j];
          if (isLeafCstNode(nextLeaf)) {
            if (nextLeaf.text === ")") {
              closeParenEnd = nextLeaf.end;
              break;
            }
            // If we hit "size" keyword, we've gone too far
            if (nextLeaf.text === "size") break;
          }
        }

        // Include any trailing whitespace
        const trailingWhitespace = this.countTrailingWhitespace(
          this.originalText,
          closeParenEnd
        );

        return {
          offset: leaf.offset,
          length: closeParenEnd - leaf.offset + trailingWhitespace,
        };
      }
    }

    return undefined;
  }

  /**
   * Find the CST span for the walls specification in a room
   */
  findWallsEnd(room: Room): number | undefined {
    if (!room.walls.$cstNode) return undefined;
    return room.walls.$cstNode.end;
  }

  /**
   * Find where to insert relative position (after walls, before label/composed)
   */
  findRelativePositionInsertPoint(room: Room): number | undefined {
    if (!room.$cstNode) return undefined;

    // If room already has relative position, return its end
    if (room.relativePosition?.$cstNode) {
      return room.relativePosition.$cstNode.end;
    }

    // Find the walls end point
    const wallsEnd = this.findWallsEnd(room);
    if (wallsEnd === undefined) return undefined;

    return wallsEnd;
  }

  /**
   * Remove the "at (x,y)" position clause from a room
   */
  removePosition(room: Room): boolean {
    const span = this.findPositionSpan(room);
    if (!span) return false;

    this.edits.push({
      offset: span.offset,
      length: span.length,
      newText: "",
    });
    return true;
  }

  /**
   * Add relative position clause to a room (after walls)
   */
  addRelativePosition(
    room: Room,
    direction: string,
    reference: string,
    gap?: number,
    alignment?: string
  ): boolean {
    const insertPoint = this.findRelativePositionInsertPoint(room);
    if (insertPoint === undefined) return false;

    // Build the relative position clause
    let clause = ` ${direction} ${reference}`;
    if (gap !== undefined && gap > 0) {
      clause += ` gap ${gap}`;
    }
    // Only add alignment if it's not the default
    const isHorizontal =
      direction.includes("right") || direction.includes("left");
    const defaultAlignment = isHorizontal ? "top" : "left";
    if (alignment && alignment !== defaultAlignment) {
      clause += ` align ${alignment}`;
    }

    this.edits.push({
      offset: insertPoint,
      length: 0,
      newText: clause,
    });
    return true;
  }

  // ==================== APPLY EDITS ====================

  /**
   * Apply all edits and return the new DSL string
   */
  apply(): string {
    // Sort edits by offset descending so we can apply from end to start
    // This ensures earlier offsets remain valid
    const sorted = [...this.edits].sort((a, b) => b.offset - a.offset);

    let result = this.originalText;
    for (const edit of sorted) {
      result =
        result.slice(0, edit.offset) +
        edit.newText +
        result.slice(edit.offset + edit.length);
    }
    return result;
  }

  /**
   * Clear all pending edits
   */
  clear(): void {
    this.edits = [];
  }

  /**
   * Get pending edit count
   */
  get pendingEditCount(): number {
    return this.edits.length;
  }

  // ==================== UTILITIES ====================

  /**
   * Flatten a CST node to get all leaf nodes
   */
  private flattenCst(node: CstNode): LeafCstNode[] {
    const leaves: LeafCstNode[] = [];
    this.collectLeaves(node, leaves);
    return leaves;
  }

  private collectLeaves(node: CstNode, result: LeafCstNode[]): void {
    if (isLeafCstNode(node)) {
      result.push(node);
    } else if (isCompositeCstNode(node)) {
      for (const child of node.content) {
        this.collectLeaves(child, result);
      }
    }
  }

  /**
   * Count trailing whitespace (spaces, not newlines) after a position
   */
  private countTrailingWhitespace(text: string, offset: number): number {
    let count = 0;
    while (offset + count < text.length) {
      const char = text[offset + count];
      if (char === " " || char === "\t") {
        count++;
      } else {
        break;
      }
    }
    return count;
  }
}
