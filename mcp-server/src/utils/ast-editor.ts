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
    const isHorizontal = direction.includes("right") || direction.includes("left");
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

