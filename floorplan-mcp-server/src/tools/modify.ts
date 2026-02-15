import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FloorplanAstEditor, type RoomParams } from '../utils/ast-editor.js';
import { parseFloorplan } from '../utils/parser.js';
import {
  buildRelativeAssignments,
  extractAllRoomBounds,
  validateForConversion,
} from '../utils/spatial.js';

const WallsSchema = z.object({
  top: z.enum(['solid', 'door', 'window', 'open']).optional(),
  right: z.enum(['solid', 'door', 'window', 'open']).optional(),
  bottom: z.enum(['solid', 'door', 'window', 'open']).optional(),
  left: z.enum(['solid', 'door', 'window', 'open']).optional(),
});

const RelativePositionSchema = z.object({
  direction: z.enum([
    'right-of',
    'left-of',
    'above',
    'below',
    'above-right-of',
    'above-left-of',
    'below-right-of',
    'below-left-of',
  ]),
  reference: z.string(),
  gap: z.number().optional(),
  alignment: z.enum(['top', 'bottom', 'left', 'right', 'center']).optional(),
});

const OperationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('add_room'),
    params: z.object({
      name: z.string(),
      // Position is now optional when using relative positioning
      position: z.object({ x: z.number(), y: z.number() }).optional(),
      size: z.object({ width: z.number(), height: z.number() }),
      walls: z.object({
        top: z.enum(['solid', 'door', 'window', 'open']),
        right: z.enum(['solid', 'door', 'window', 'open']),
        bottom: z.enum(['solid', 'door', 'window', 'open']),
        left: z.enum(['solid', 'door', 'window', 'open']),
      }),
      label: z.string().optional(),
      // New: relative positioning support
      relativePosition: RelativePositionSchema.optional(),
    }),
  }),
  z.object({
    action: z.literal('remove_room'),
    target: z.string(),
  }),
  z.object({
    action: z.literal('resize_room'),
    target: z.string(),
    params: z.object({
      width: z.number(),
      height: z.number(),
    }),
  }),
  z.object({
    action: z.literal('move_room'),
    target: z.string(),
    params: z.object({
      x: z.number(),
      y: z.number(),
    }),
  }),
  z.object({
    action: z.literal('rename_room'),
    target: z.string(),
    params: z.object({
      newName: z.string(),
    }),
  }),
  z.object({
    action: z.literal('update_walls'),
    target: z.string(),
    params: WallsSchema,
  }),
  z.object({
    action: z.literal('add_label'),
    target: z.string(),
    params: z.object({
      label: z.string(),
    }),
  }),
  z.object({
    action: z.literal('convert_to_relative'),
    params: z.object({
      // The anchor room keeps its absolute position
      anchorRoom: z.string().describe("Room to keep absolute 'at (x,y)' position"),
      // Tolerance for alignment detection (default: 1 unit)
      alignmentTolerance: z.number().default(1).optional(),
      // Which rooms to convert (if omitted, converts all except anchor)
      targetRooms: z.array(z.string()).optional(),
    }),
  }),
]);

const ModifyInputSchema = z.object({
  dsl: z.string().describe('Current floorplan DSL code'),
  operations: z.array(OperationSchema).describe('List of modifications to apply'),
});

type Operation = z.infer<typeof OperationSchema>;

interface ChangeResult {
  action: string;
  target: string;
  result: 'applied' | 'skipped' | 'error';
  message?: string;
}

export function registerModifyTool(server: McpServer): void {
  server.tool(
    'modify_floorplan',
    'Apply modifications to a floorplan DSL and return the updated code',
    ModifyInputSchema.shape,
    async (args) => {
      const { dsl, operations } = ModifyInputSchema.parse(args);

      // First validate the input DSL
      const parseResult = await parseFloorplan(dsl);
      if (parseResult.errors.length > 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                errors: parseResult.errors.map((e, i) => ({
                  ...e,
                  operation: i,
                })),
              }),
            },
          ],
        };
      }

      let currentDsl = dsl;
      const changes: ChangeResult[] = [];
      const errors: Array<{ message: string; operation?: number }> = [];

      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        try {
          const result = await applyOperation(currentDsl, op);
          currentDsl = result.dsl;
          changes.push(result.change);
        } catch (error) {
          errors.push({
            message: error instanceof Error ? error.message : 'Unknown error',
            operation: i,
          });
          changes.push({
            action: op.action,
            target:
              'target' in op
                ? op.target
                : 'params' in op && 'name' in op.params
                  ? op.params.name
                  : 'unknown',
            result: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Validate the final DSL
      const finalParseResult = await parseFloorplan(currentDsl);
      if (finalParseResult.errors.length > 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                dsl: currentDsl,
                changes,
                errors: [
                  ...errors,
                  ...finalParseResult.errors.map((e) => ({
                    message: `Final DSL validation error: ${e.message}`,
                  })),
                ],
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: errors.length === 0,
              dsl: currentDsl,
              changes,
              errors: errors.length > 0 ? errors : undefined,
            }),
          },
        ],
      };
    },
  );
}

async function applyOperation(
  dsl: string,
  op: Operation,
): Promise<{ dsl: string; change: ChangeResult }> {
  // Parse the DSL for AST-based operations
  const parseResult = await parseFloorplan(dsl);
  if (!parseResult.document) {
    throw new Error('Failed to parse floorplan');
  }

  const editor = new FloorplanAstEditor(parseResult.document, dsl);

  switch (op.action) {
    case 'add_room':
      return addRoom(editor, op.params);
    case 'remove_room':
      return removeRoom(editor, op.target);
    case 'resize_room':
      return resizeRoom(editor, op.target, op.params);
    case 'move_room':
      return moveRoom(editor, op.target, op.params);
    case 'rename_room':
      return renameRoom(editor, op.target, op.params.newName);
    case 'update_walls':
      return updateWalls(editor, op.target, op.params);
    case 'add_label':
      return addLabel(editor, op.target, op.params.label);
    case 'convert_to_relative':
      return convertToRelative(editor, op.params);
  }
}

function addRoom(
  editor: FloorplanAstEditor,
  params: RoomParams,
): { dsl: string; change: ChangeResult } {
  const success = editor.addRoom(params);

  if (!success) {
    throw new Error('Could not find floor block to add room');
  }

  return {
    dsl: editor.apply(),
    change: {
      action: 'add_room',
      target: params.name,
      result: 'applied',
    },
  };
}

function removeRoom(
  editor: FloorplanAstEditor,
  target: string,
): { dsl: string; change: ChangeResult } {
  const room = editor.findRoom(target);
  if (!room) {
    throw new Error(`Room "${target}" not found`);
  }

  const success = editor.removeRoom(room);
  if (!success) {
    throw new Error(`Could not remove room "${target}"`);
  }

  return {
    dsl: editor.apply(),
    change: {
      action: 'remove_room',
      target,
      result: 'applied',
    },
  };
}

function resizeRoom(
  editor: FloorplanAstEditor,
  target: string,
  params: { width: number; height: number },
): { dsl: string; change: ChangeResult } {
  const room = editor.findRoom(target);
  if (!room) {
    throw new Error(`Room "${target}" not found`);
  }

  const success = editor.resizeRoom(room, params.width, params.height);
  if (!success) {
    throw new Error(`Could not resize room "${target}"`);
  }

  return {
    dsl: editor.apply(),
    change: {
      action: 'resize_room',
      target,
      result: 'applied',
      message: `Resized to ${params.width} x ${params.height}`,
    },
  };
}

function moveRoom(
  editor: FloorplanAstEditor,
  target: string,
  params: { x: number; y: number },
): { dsl: string; change: ChangeResult } {
  const room = editor.findRoom(target);
  if (!room) {
    throw new Error(`Room "${target}" not found`);
  }

  const success = editor.moveRoom(room, params.x, params.y);
  if (!success) {
    throw new Error(`Could not move room "${target}"`);
  }

  const message = room.position
    ? `Moved to (${params.x}, ${params.y})`
    : `Added position (${params.x}, ${params.y})`;

  return {
    dsl: editor.apply(),
    change: {
      action: 'move_room',
      target,
      result: 'applied',
      message,
    },
  };
}

function renameRoom(
  editor: FloorplanAstEditor,
  target: string,
  newName: string,
): { dsl: string; change: ChangeResult } {
  const room = editor.findRoom(target);
  if (!room) {
    throw new Error(`Room "${target}" not found`);
  }

  const success = editor.renameRoom(room, newName);
  if (!success) {
    throw new Error(`Could not rename room "${target}"`);
  }

  return {
    dsl: editor.apply(),
    change: {
      action: 'rename_room',
      target,
      result: 'applied',
      message: `Renamed to ${newName}`,
    },
  };
}

function updateWalls(
  editor: FloorplanAstEditor,
  target: string,
  params: { top?: string; right?: string; bottom?: string; left?: string },
): { dsl: string; change: ChangeResult } {
  const room = editor.findRoom(target);
  if (!room) {
    throw new Error(`Room "${target}" not found`);
  }

  const success = editor.updateWalls(room, params);
  if (!success) {
    throw new Error(`Could not update walls for room "${target}"`);
  }

  return {
    dsl: editor.apply(),
    change: {
      action: 'update_walls',
      target,
      result: 'applied',
    },
  };
}

function addLabel(
  editor: FloorplanAstEditor,
  target: string,
  label: string,
): { dsl: string; change: ChangeResult } {
  const room = editor.findRoom(target);
  if (!room) {
    throw new Error(`Room "${target}" not found`);
  }

  const hadLabel = !!room.label;
  const success = editor.updateLabel(room, label);
  if (!success) {
    throw new Error(`Could not add label to room "${target}"`);
  }

  return {
    dsl: editor.apply(),
    change: {
      action: 'add_label',
      target,
      result: 'applied',
      message: hadLabel ? 'Updated existing label' : undefined,
    },
  };
}

function convertToRelative(
  editor: FloorplanAstEditor,
  params: {
    anchorRoom: string;
    alignmentTolerance?: number;
    targetRooms?: string[];
  },
): { dsl: string; change: ChangeResult } {
  const { anchorRoom, alignmentTolerance = 1, targetRooms } = params;

  // Get all rooms
  const allRooms = editor.getAllRooms();

  // Validate the conversion is possible
  const validation = validateForConversion(allRooms, anchorRoom);
  if (!validation.valid) {
    throw new Error(`Cannot convert to relative: ${validation.errors.join('; ')}`);
  }

  // Extract room bounds for spatial analysis
  const roomBounds = extractAllRoomBounds(allRooms);

  // Build relative assignments
  const { assignments, unresolved } = buildRelativeAssignments(
    roomBounds,
    anchorRoom,
    alignmentTolerance,
  );

  if (unresolved.length > 0) {
    throw new Error(
      `Could not determine relative positions for rooms: ${unresolved.join(', ')}. ` +
        `These rooms may be too far from other rooms.`,
    );
  }

  // Filter assignments if targetRooms is specified
  const targetSet = targetRooms ? new Set(targetRooms) : null;
  const filteredAssignments = targetSet
    ? assignments.filter((a) => targetSet.has(a.room))
    : assignments;

  // Apply edits for each assignment
  for (const assignment of filteredAssignments) {
    const room = editor.findRoom(assignment.room);
    if (!room) continue;

    // Remove absolute position
    editor.removePosition(room);

    // Add relative position
    editor.addRelativePosition(
      room,
      assignment.direction,
      assignment.reference,
      assignment.gap,
      assignment.alignment,
    );
  }

  return {
    dsl: editor.apply(),
    change: {
      action: 'convert_to_relative',
      target: anchorRoom,
      result: 'applied',
      message: `Converted ${filteredAssignments.length} room(s) to relative positioning`,
    },
  };
}
