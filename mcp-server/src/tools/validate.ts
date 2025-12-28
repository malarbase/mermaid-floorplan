import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { parseFloorplan } from "../utils/parser.js";

const ValidateInputSchema = z.object({
  dsl: z.string().describe("Floorplan DSL code to validate"),
});

export function registerValidateTool(server: McpServer): void {
  server.tool(
    "validate_floorplan",
    "Validate floorplan DSL syntax without rendering",
    ValidateInputSchema.shape,
    async (args) => {
      const { dsl } = ValidateInputSchema.parse(args);

      const parseResult = await parseFloorplan(dsl);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              valid: parseResult.errors.length === 0,
              errors: parseResult.errors,
            }),
          },
        ],
      };
    }
  );
}

