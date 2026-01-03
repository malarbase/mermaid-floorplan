/**
 * Re-export all types from floorplan-3d-core shared library
 * This ensures consistent types between viewer and MCP server
 */
export type {
  JsonConfig,
  JsonStyle,
  JsonExport,
  JsonFloor,
  JsonStair,
  JsonLift,
  JsonRoom,
  JsonWall,
  JsonConnection,
} from 'floorplan-3d-core';
