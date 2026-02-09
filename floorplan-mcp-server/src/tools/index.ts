import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAnalyzeTool } from './analyze.js';
import { registerModifyTool } from './modify.js';
import { registerRenderTool } from './render.js';
import { registerValidateTool } from './validate.js';

export function registerTools(server: McpServer): void {
  registerRenderTool(server);
  registerValidateTool(server);
  registerModifyTool(server);
  registerAnalyzeTool(server);
}
