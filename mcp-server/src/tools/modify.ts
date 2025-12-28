import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { parseFloorplan } from "../utils/parser.js";

const WallsSchema = z.object({
  top: z.enum(["solid", "door", "window", "open"]).optional(),
  right: z.enum(["solid", "door", "window", "open"]).optional(),
  bottom: z.enum(["solid", "door", "window", "open"]).optional(),
  left: z.enum(["solid", "door", "window", "open"]).optional(),
});

const OperationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add_room"),
    params: z.object({
      name: z.string(),
      position: z.object({ x: z.number(), y: z.number() }),
      size: z.object({ width: z.number(), height: z.number() }),
      walls: z.object({
        top: z.enum(["solid", "door", "window", "open"]),
        right: z.enum(["solid", "door", "window", "open"]),
        bottom: z.enum(["solid", "door", "window", "open"]),
        left: z.enum(["solid", "door", "window", "open"]),
      }),
      label: z.string().optional(),
    }),
  }),
  z.object({
    action: z.literal("remove_room"),
    target: z.string(),
  }),
  z.object({
    action: z.literal("resize_room"),
    target: z.string(),
    params: z.object({
      width: z.number(),
      height: z.number(),
    }),
  }),
  z.object({
    action: z.literal("move_room"),
    target: z.string(),
    params: z.object({
      x: z.number(),
      y: z.number(),
    }),
  }),
  z.object({
    action: z.literal("rename_room"),
    target: z.string(),
    params: z.object({
      newName: z.string(),
    }),
  }),
  z.object({
    action: z.literal("update_walls"),
    target: z.string(),
    params: WallsSchema,
  }),
  z.object({
    action: z.literal("add_label"),
    target: z.string(),
    params: z.object({
      label: z.string(),
    }),
  }),
]);

const ModifyInputSchema = z.object({
  dsl: z.string().describe("Current floorplan DSL code"),
  operations: z.array(OperationSchema).describe("List of modifications to apply"),
});

type Operation = z.infer<typeof OperationSchema>;

interface ChangeResult {
  action: string;
  target: string;
  result: "applied" | "skipped" | "error";
  message?: string;
}

export function registerModifyTool(server: McpServer): void {
  server.tool(
    "modify_floorplan",
    "Apply modifications to a floorplan DSL and return the updated code",
    ModifyInputSchema.shape,
    async (args) => {
      const { dsl, operations } = ModifyInputSchema.parse(args);

      // First validate the input DSL
      const parseResult = await parseFloorplan(dsl);
      if (parseResult.errors.length > 0) {
        return {
          content: [
            {
              type: "text" as const,
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
            message: error instanceof Error ? error.message : "Unknown error",
            operation: i,
          });
          changes.push({
            action: op.action,
            target: "target" in op ? op.target : "params" in op && "name" in op.params ? op.params.name : "unknown",
            result: "error",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Validate the final DSL
      const finalParseResult = await parseFloorplan(currentDsl);
      if (finalParseResult.errors.length > 0) {
        return {
          content: [
            {
              type: "text" as const,
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
            type: "text" as const,
            text: JSON.stringify({
              success: errors.length === 0,
              dsl: currentDsl,
              changes,
              errors: errors.length > 0 ? errors : undefined,
            }),
          },
        ],
      };
    }
  );
}

async function applyOperation(
  dsl: string,
  op: Operation
): Promise<{ dsl: string; change: ChangeResult }> {
  switch (op.action) {
    case "add_room":
      return addRoom(dsl, op.params);
    case "remove_room":
      return removeRoom(dsl, op.target);
    case "resize_room":
      return resizeRoom(dsl, op.target, op.params);
    case "move_room":
      return moveRoom(dsl, op.target, op.params);
    case "rename_room":
      return renameRoom(dsl, op.target, op.params.newName);
    case "update_walls":
      return updateWalls(dsl, op.target, op.params);
    case "add_label":
      return addLabel(dsl, op.target, op.params.label);
  }
}

function addRoom(
  dsl: string,
  params: {
    name: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    walls: { top: string; right: string; bottom: string; left: string };
    label?: string;
  }
): { dsl: string; change: ChangeResult } {
  const { name, position, size, walls, label } = params;

  // Find the closing brace of the floor block
  const floorEndMatch = dsl.match(/(\n\s*)\}/);
  if (!floorEndMatch) {
    throw new Error("Could not find floor block closing brace");
  }

  const indent = "      "; // Match existing indentation
  let roomLine = `${indent}room ${name} at (${position.x},${position.y}) size (${size.width} x ${size.height}) walls [top: ${walls.top}, right: ${walls.right}, bottom: ${walls.bottom}, left: ${walls.left}]`;

  if (label) {
    roomLine += ` label "${label}"`;
  }

  // Insert before the closing brace
  const insertIndex = dsl.lastIndexOf("}");
  const newDsl = dsl.slice(0, insertIndex) + roomLine + "\n" + dsl.slice(insertIndex);

  return {
    dsl: newDsl,
    change: {
      action: "add_room",
      target: name,
      result: "applied",
    },
  };
}

function removeRoom(dsl: string, target: string): { dsl: string; change: ChangeResult } {
  // Match room line with optional label and sub-rooms
  const roomPattern = new RegExp(
    `^\\s*room\\s+${escapeRegex(target)}\\s+at\\s+\\([^)]+\\)\\s+size\\s+\\([^)]+\\)\\s+walls\\s+\\[[^\\]]+\\](?:\\s+label\\s+"[^"]*")?(?:\\s+composed\\s+of\\s+\\[[^\\]]*\\])?\\s*$`,
    "m"
  );

  const match = dsl.match(roomPattern);
  if (!match) {
    throw new Error(`Room "${target}" not found`);
  }

  const newDsl = dsl.replace(roomPattern, "").replace(/\n\n+/g, "\n");

  return {
    dsl: newDsl,
    change: {
      action: "remove_room",
      target,
      result: "applied",
    },
  };
}

function resizeRoom(
  dsl: string,
  target: string,
  params: { width: number; height: number }
): { dsl: string; change: ChangeResult } {
  const sizePattern = new RegExp(
    `(room\\s+${escapeRegex(target)}\\s+at\\s+\\([^)]+\\)\\s+size\\s+\\()\\d+\\s*x\\s*\\d+(\\))`,
    "g"
  );

  const match = dsl.match(sizePattern);
  if (!match) {
    throw new Error(`Room "${target}" not found`);
  }

  const newDsl = dsl.replace(sizePattern, `$1${params.width} x ${params.height}$2`);

  return {
    dsl: newDsl,
    change: {
      action: "resize_room",
      target,
      result: "applied",
      message: `Resized to ${params.width} x ${params.height}`,
    },
  };
}

function moveRoom(
  dsl: string,
  target: string,
  params: { x: number; y: number }
): { dsl: string; change: ChangeResult } {
  const posPattern = new RegExp(
    `(room\\s+${escapeRegex(target)}\\s+at\\s+\\()[^)]+(\\))`,
    "g"
  );

  const match = dsl.match(posPattern);
  if (!match) {
    throw new Error(`Room "${target}" not found`);
  }

  const newDsl = dsl.replace(posPattern, `$1${params.x},${params.y}$2`);

  return {
    dsl: newDsl,
    change: {
      action: "move_room",
      target,
      result: "applied",
      message: `Moved to (${params.x}, ${params.y})`,
    },
  };
}

function renameRoom(
  dsl: string,
  target: string,
  newName: string
): { dsl: string; change: ChangeResult } {
  const namePattern = new RegExp(`(room\\s+)${escapeRegex(target)}(\\s+at)`, "g");

  const match = dsl.match(namePattern);
  if (!match) {
    throw new Error(`Room "${target}" not found`);
  }

  const newDsl = dsl.replace(namePattern, `$1${newName}$2`);

  return {
    dsl: newDsl,
    change: {
      action: "rename_room",
      target,
      result: "applied",
      message: `Renamed to ${newName}`,
    },
  };
}

function updateWalls(
  dsl: string,
  target: string,
  params: { top?: string; right?: string; bottom?: string; left?: string }
): { dsl: string; change: ChangeResult } {
  // Find the room's walls specification
  const wallsPattern = new RegExp(
    `(room\\s+${escapeRegex(target)}\\s+at\\s+\\([^)]+\\)\\s+size\\s+\\([^)]+\\)\\s+walls\\s+\\[)([^\\]]+)(\\])`,
    "g"
  );

  const match = dsl.match(wallsPattern);
  if (!match) {
    throw new Error(`Room "${target}" not found`);
  }

  const newDsl = dsl.replace(wallsPattern, (_match, prefix, walls, suffix) => {
    let newWalls = walls;
    if (params.top) {
      newWalls = newWalls.replace(/top:\s*\w+/, `top: ${params.top}`);
    }
    if (params.right) {
      newWalls = newWalls.replace(/right:\s*\w+/, `right: ${params.right}`);
    }
    if (params.bottom) {
      newWalls = newWalls.replace(/bottom:\s*\w+/, `bottom: ${params.bottom}`);
    }
    if (params.left) {
      newWalls = newWalls.replace(/left:\s*\w+/, `left: ${params.left}`);
    }
    return prefix + newWalls + suffix;
  });

  return {
    dsl: newDsl,
    change: {
      action: "update_walls",
      target,
      result: "applied",
    },
  };
}

function addLabel(
  dsl: string,
  target: string,
  label: string
): { dsl: string; change: ChangeResult } {
  // Check if room already has a label
  const existingLabelPattern = new RegExp(
    `(room\\s+${escapeRegex(target)}\\s+at\\s+\\([^)]+\\)\\s+size\\s+\\([^)]+\\)\\s+walls\\s+\\[[^\\]]+\\]\\s+label\\s+)"[^"]*"`,
    "g"
  );

  if (existingLabelPattern.test(dsl)) {
    // Update existing label
    const newDsl = dsl.replace(existingLabelPattern, `$1"${label}"`);
    return {
      dsl: newDsl,
      change: {
        action: "add_label",
        target,
        result: "applied",
        message: "Updated existing label",
      },
    };
  }

  // Add new label after walls specification
  const noLabelPattern = new RegExp(
    `(room\\s+${escapeRegex(target)}\\s+at\\s+\\([^)]+\\)\\s+size\\s+\\([^)]+\\)\\s+walls\\s+\\[[^\\]]+\\])`,
    "g"
  );

  const match = dsl.match(noLabelPattern);
  if (!match) {
    throw new Error(`Room "${target}" not found`);
  }

  const newDsl = dsl.replace(noLabelPattern, `$1 label "${label}"`);

  return {
    dsl: newDsl,
    change: {
      action: "add_label",
      target,
      result: "applied",
    },
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

