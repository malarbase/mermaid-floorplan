/**
 * Room rendering utilities for floorplan SVG generation
 * Following Mermaid diagram conventions
 */

import type { Room } from "../../generated/ast.js";
import { wallRectangle } from "./wall.js";

export function generateRoomText(
  room: Room,
  centerX: number,
  centerY: number
): string {
  const sizeText = `${room.size.width} x ${room.size.height}`;

  let textElements = `<text x="${centerX}" y="${centerY - 1}" text-anchor="middle" dominant-baseline="middle" 
    class="room-name" font-size="0.8" fill="black">${room.name}</text>`;

  if (room.label) {
    textElements += `<text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="middle" 
      class="room-label" font-size="0.8">${room.label}</text>`;
  }

  textElements += `<text x="${centerX}" y="${centerY + 1}" text-anchor="middle" dominant-baseline="middle" 
    class="room-size" font-size="0.7" fill="gray">${sizeText}</text>`;

  return textElements;
}

export function generateRoomSvg(
  room: Room,
  parentOffsetX: number = 0,
  parentOffsetY: number = 0
): string {
  const x = room.position.x + parentOffsetX;
  const y = room.position.y + parentOffsetY;
  const width = room.size.width;
  const height = room.size.height;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  const wallThickness = 0.2;

  const getWallType = (direction: string): string => {
    const wallSpec = room.walls.specifications.find(
      (spec) => spec.direction === direction
    );
    return wallSpec?.type || "solid";
  };

  const topWall = wallRectangle(x, y, width, wallThickness, getWallType("top"), "top");
  const rightWall = wallRectangle(x + width - wallThickness, y, wallThickness, height, getWallType("right"), "right");
  const bottomWall = wallRectangle(x, y + height - wallThickness, width, wallThickness, getWallType("bottom"), "bottom");
  const leftWall = wallRectangle(x, y, wallThickness, height, getWallType("left"), "left");

  let subRoomSvg = "";
  if (room.subRooms && room.subRooms.length > 0) {
    for (const subRoom of room.subRooms) {
      subRoomSvg += generateRoomSvg(subRoom, x, y);
    }
  }

  return `<g class="room" data-room="${room.name}">${topWall}${rightWall}${bottomWall}${leftWall}${generateRoomText(room, centerX, centerY)}${subRoomSvg}</g>`;
}

