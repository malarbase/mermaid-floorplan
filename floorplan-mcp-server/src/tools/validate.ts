import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { validateFloorplan } from '../utils/parser.js';

const ValidateInputSchema = z.object({
  dsl: z.string().describe('Floorplan DSL code to validate'),
});

export function registerValidateTool(server: McpServer): void {
  server.tool(
    'validate_floorplan',
    'Validate floorplan DSL syntax without rendering',
    ValidateInputSchema.shape,
    async (args) => {
      const { dsl } = ValidateInputSchema.parse(args);

      const result = await validateFloorplan(dsl);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              valid: result.valid,
              errors: result.errors,
              warnings: result.warnings.length > 0 ? result.warnings : undefined,
            }),
          },
        ],
      };
    },
  );
}
