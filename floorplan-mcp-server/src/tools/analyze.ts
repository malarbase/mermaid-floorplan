import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { parseFloorplan, validateFloorplan } from "../utils/parser.js";
import { convertFloorplanToJson } from "floorplan-language";

const AnalyzeInputSchema = z.object({
  dsl: z.string().describe("Floorplan DSL code to analyze"),
  areaUnit: z
    .enum(["sqft", "sqm"])
    .default("sqft")
    .describe("Unit for area values: 'sqft' (default) or 'sqm'"),
  includeRoomDetails: z
    .boolean()
    .default(true)
    .describe("Include per-room breakdown in response. Default: true"),
});

/** Convert square feet to square meters */
function sqftToSqm(sqft: number): number {
  return sqft * 0.092903;
}

/** Format area value based on unit */
function formatArea(area: number, unit: 'sqft' | 'sqm'): number {
  if (unit === 'sqm') {
    return Math.round(sqftToSqm(area) * 100) / 100;
  }
  return area;
}

export function registerAnalyzeTool(server: McpServer): void {
  server.tool(
    "analyze_floorplan",
    "Parse floorplan DSL and return structured metrics (areas, dimensions, efficiency) without rendering. Use this for spatial analysis before deciding to render.",
    AnalyzeInputSchema.shape,
    async (args) => {
      const { dsl, areaUnit, includeRoomDetails } = AnalyzeInputSchema.parse(args);

      const parseResult = await parseFloorplan(dsl);

      if (parseResult.errors.length > 0 || !parseResult.document) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                errors: parseResult.errors,
              }),
            },
          ],
        };
      }

      try {
        // Run validation to get warnings
        const validationResult = await validateFloorplan(dsl);
        
        // Check for non-parse validation errors
        if (validationResult.errors.some(e => e.type !== 'parse')) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  errors: validationResult.errors,
                  warnings: validationResult.warnings.length > 0 ? validationResult.warnings : undefined,
                }),
              },
            ],
          };
        }

        // Compute metrics using JSON converter
        const jsonResult = convertFloorplanToJson(parseResult.document.parseResult.value);
        
        if (!jsonResult.data) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  errors: [{ message: "Failed to convert floorplan to JSON" }],
                }),
              },
            ],
          };
        }

        const { floors, summary } = jsonResult.data;

        // Build summary response
        const summaryResponse = summary ? {
          floorCount: summary.floorCount,
          totalRooms: summary.totalRoomCount,
          grossFloorArea: formatArea(summary.grossFloorArea, areaUnit),
          areaUnit,
        } : undefined;

        // Build per-floor metrics
        const floorsResponse = floors.map(floor => {
          const metrics = floor.metrics;
          return {
            id: floor.id,
            index: floor.index,
            roomCount: metrics?.roomCount ?? floor.rooms.length,
            netArea: formatArea(metrics?.netArea ?? 0, areaUnit),
            boundingBox: metrics?.boundingBox ? {
              width: metrics.boundingBox.width,
              height: metrics.boundingBox.height,
              area: formatArea(metrics.boundingBox.area, areaUnit),
              minX: metrics.boundingBox.minX,
              minY: metrics.boundingBox.minY,
            } : undefined,
            efficiency: metrics?.efficiency ?? 0,
          };
        });

        // Build per-room metrics if requested
        let roomsResponse: Array<{
          name: string;
          floor: string;
          area: number;
          dimensions: { width: number; height: number };
          volume?: number;
          label?: string;
        }> | undefined;

        if (includeRoomDetails) {
          roomsResponse = [];
          for (const floor of floors) {
            for (const room of floor.rooms) {
              roomsResponse.push({
                name: room.name,
                floor: floor.id,
                area: formatArea(room.area ?? (room.width * room.height), areaUnit),
                dimensions: { width: room.width, height: room.height },
                volume: room.volume ? formatArea(room.volume, areaUnit) : undefined,
                label: room.label,
              });
            }
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                summary: summaryResponse,
                floors: floorsResponse,
                rooms: roomsResponse,
                warnings: validationResult.warnings.length > 0 ? validationResult.warnings : undefined,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                success: false,
                errors: [
                  {
                    message: error instanceof Error ? error.message : "Unknown analysis error",
                  },
                ],
              }),
            },
          ],
        };
      }
    }
  );
}

