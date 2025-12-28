import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { parseFloorplan, extractAllRoomMetadata } from "../utils/parser.js";
import { generateSvg, svgToPng } from "../utils/renderer.js";

const RenderInputSchema = z.object({
  dsl: z.string().describe("Floorplan DSL code to render"),
  format: z
    .enum(["png", "svg"])
    .default("png")
    .describe("Output format: 'png' for image (default), 'svg' for vector"),
  width: z.number().default(800).describe("Output image width in pixels"),
  height: z.number().default(600).describe("Output image height in pixels"),
  floorIndex: z
    .number()
    .optional()
    .describe("Index of the floor to render (0-based). Default: 0 (first floor)"),
  renderAllFloors: z
    .boolean()
    .optional()
    .describe("Render all floors in a single image. Default: false"),
  multiFloorLayout: z
    .enum(["stacked", "sideBySide"])
    .optional()
    .describe("Layout for multi-floor rendering: 'stacked' (vertical) or 'sideBySide' (horizontal). Default: 'sideBySide'"),
});

export function registerRenderTool(server: McpServer): void {
  server.tool(
    "render_floorplan",
    "Parse floorplan DSL and render to PNG image that the LLM can visually analyze",
    RenderInputSchema.shape,
    async (args) => {
      const { dsl, format, width, height, floorIndex, renderAllFloors, multiFloorLayout } = RenderInputSchema.parse(args);

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
        const svg = generateSvg(parseResult.document, {
          floorIndex,
          renderAllFloors,
          multiFloorLayout,
        });
        const rooms = extractAllRoomMetadata(parseResult.document);
        const floorCount = parseResult.document.parseResult.value.floors.length;

        // Return SVG format if requested
        if (format === "svg") {
          return {
            content: [
              {
                type: "text" as const,
                text: svg,
              },
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: true,
                  format: "svg",
                  floorCount,
                  renderedFloor: renderAllFloors ? "all" : (floorIndex ?? 0),
                  rooms,
                }),
              },
            ],
          };
        }

        // Default: return PNG format
        const pngBuffer = await svgToPng(svg, width, height);

        return {
          content: [
            {
              type: "image" as const,
              data: pngBuffer.toString("base64"),
              mimeType: "image/png" as const,
            },
            {
              type: "text" as const,
              text: JSON.stringify({
                success: true,
                format: "png",
                floorCount,
                renderedFloor: renderAllFloors ? "all" : (floorIndex ?? 0),
                rooms,
              }),
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
                    message:
                      error instanceof Error
                        ? error.message
                        : "Unknown rendering error",
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
