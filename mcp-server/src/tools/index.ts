import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerRenderTool } from "./render.js";
import { registerValidateTool } from "./validate.js";
import { registerModifyTool } from "./modify.js";

export function registerTools(server: McpServer): void {
  registerRenderTool(server);
  registerValidateTool(server);
  registerModifyTool(server);
}

