#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/index.js";
import { registerResources } from "./resources/index.js";

const server = new McpServer({
  name: "floorplans-mcp-server",
  version: "0.0.1",
});

// Register tools and resources
registerTools(server);
registerResources(server);

// Start server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);

