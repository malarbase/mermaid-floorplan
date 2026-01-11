import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { parseFloorplan, extractAllRoomMetadata, validateFloorplan, type ValidationWarning } from "../utils/parser.js";
import { generateSvg, svgToPng } from "../utils/renderer.js";
import { render3DToPng, formatSceneBounds } from "../utils/renderer3d.js";
import { convertFloorplanToJson, type FloorplanSummary, type FloorMetrics } from "floorplan-language";

const RenderInputSchema = z.object({
  dsl: z.string().describe("Floorplan DSL code to render"),
  format: z
    .enum(["png", "svg", "3d-png"])
    .default("png")
    .describe("Output format: 'png' for 2D image (default), 'svg' for vector, '3d-png' for 3D perspective view"),
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
  // Annotation options
  showArea: z
    .boolean()
    .optional()
    .describe("Show room area labels inside each room. Default: false"),
  showDimensions: z
    .boolean()
    .optional()
    .describe("Show dimension lines on room edges with measurements. Default: false"),
  showFloorSummary: z
    .boolean()
    .optional()
    .describe("Show floor summary panel with metrics (room count, net area, efficiency). Default: false"),
  areaUnit: z
    .enum(["sqft", "sqm"])
    .optional()
    .describe("Unit for area display: 'sqft' (default) or 'sqm'"),
  lengthUnit: z
    .enum(["m", "ft", "cm", "in", "mm"])
    .optional()
    .describe("Unit for dimension labels: 'ft' (default), 'm', 'cm', 'in', 'mm'"),
  // 3D rendering options
  projection: z
    .enum(["isometric", "perspective"])
    .optional()
    .describe("3D camera projection mode: 'isometric' (default) for orthographic view, 'perspective' for realistic depth"),
  cameraPosition: z
    .object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    })
    .optional()
    .describe("Camera position for perspective mode. Y is up."),
  cameraTarget: z
    .object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    })
    .optional()
    .describe("Camera look-at target for perspective mode"),
  fov: z
    .number()
    .min(10)
    .max(120)
    .optional()
    .describe("Field of view in degrees for perspective mode (default: 50)"),
});

export function registerRenderTool(server: McpServer): void {
  server.tool(
    "render_floorplan",
    "Parse floorplan DSL and render to PNG image that the LLM can visually analyze. Supports 2D top-down view (png/svg) and 3D perspective view (3d-png).",
    RenderInputSchema.shape,
    async (args) => {
      const { 
        dsl, format, width, height, floorIndex, renderAllFloors, multiFloorLayout,
        showArea, showDimensions, showFloorSummary, areaUnit, lengthUnit,
        projection, cameraPosition, cameraTarget, fov
      } = RenderInputSchema.parse(args);

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
        // Run validation to get warnings (errors would have been caught by parseFloorplan)
        const validationResult = await validateFloorplan(dsl);
        const warnings: ValidationWarning[] = validationResult.warnings;
        
        // Check for non-parse validation errors (circular deps, missing refs)
        if (validationResult.errors.some(e => e.type !== 'parse')) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: false,
                  errors: validationResult.errors,
                  warnings: warnings.length > 0 ? warnings : undefined,
                }),
              },
            ],
          };
        }

        // Get JSON data for all formats
        const jsonResult = convertFloorplanToJson(parseResult.document.parseResult.value);
        const summary: FloorplanSummary | undefined = jsonResult.data?.summary;
        const floorMetrics: FloorMetrics[] | undefined = jsonResult.data?.floors.map(f => f.metrics!).filter(Boolean);
        const floorCount = parseResult.document.parseResult.value.floors.length;

        // Handle 3D PNG format
        if (format === "3d-png") {
          if (!jsonResult.data) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    success: false,
                    errors: [{ message: "Failed to convert floorplan to JSON for 3D rendering" }],
                  }),
                },
              ],
            };
          }

          try {
            // Convert camera position/target from objects to tuples for the renderer
            const cameraPosTuple = cameraPosition 
              ? [cameraPosition.x, cameraPosition.y, cameraPosition.z] as [number, number, number]
              : undefined;
            const cameraTargetTuple = cameraTarget
              ? [cameraTarget.x, cameraTarget.y, cameraTarget.z] as [number, number, number]
              : undefined;

            const result = await render3DToPng(jsonResult.data, {
              width,
              height,
              projection,
              cameraPosition: cameraPosTuple,
              cameraTarget: cameraTargetTuple,
              fov,
              renderAllFloors,
              floorIndex,
            });

            return {
              content: [
                {
                  type: "image" as const,
                  data: result.pngBuffer.toString("base64"),
                  mimeType: "image/png" as const,
                },
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    success: true,
                    format: "3d-png",
                    projection: result.metadata.projection,
                    floorCount,
                    floorsRendered: result.metadata.floorsRendered,
                    cameraPosition: result.metadata.cameraPosition,
                    cameraTarget: result.metadata.cameraTarget,
                    fov: result.metadata.fov,
                    sceneBounds: formatSceneBounds(result.metadata.sceneBounds),
                    summary,
                    floorMetrics,
                    warnings: warnings.length > 0 ? warnings : undefined,
                  }),
                },
              ],
            };
          } catch (error) {
            // Provide helpful error message for 3D rendering failures
            const errorMessage = error instanceof Error ? error.message : "Unknown 3D rendering error";
            const isGLError = errorMessage.includes("WebGL") || errorMessage.includes("headless");

            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    success: false,
                    errors: [
                      {
                        message: errorMessage,
                        ...(isGLError && {
                          guidance: "3D rendering requires headless-gl. Install platform dependencies: " +
                            "macOS (XCode CLI), Linux (libxi-dev, libglu1-mesa-dev, libglew-dev), " +
                            "Windows (Visual Studio Build Tools).",
                        }),
                      },
                    ],
                  }),
                },
              ],
            };
          }
        }
        
        // 2D rendering (SVG or PNG)
        const svg = generateSvg(parseResult.document, {
          floorIndex,
          renderAllFloors,
          multiFloorLayout,
          showArea,
          showDimensions,
          showFloorSummary,
          areaUnit,
          lengthUnit,
        });
        const rooms = extractAllRoomMetadata(parseResult.document);

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
                  summary,
                  floorMetrics,
                  warnings: warnings.length > 0 ? warnings : undefined,
                }),
              },
            ],
          };
        }

        // Default: return PNG format (2D)
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
                summary,
                floorMetrics,
                warnings: warnings.length > 0 ? warnings : undefined,
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
