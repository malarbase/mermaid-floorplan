/**
 * Puppeteer-based 3D rendering for floorplan visualization
 * Uses headless Chromium for full WebGL2 support
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import puppeteer, { Browser } from 'puppeteer';

// Create CommonJS-style require for module resolution
const require = createRequire(import.meta.url);
import type {
  JsonExport,
  Render3DOptions,
  Render3DResult,
} from 'floorplan-3d-core';

// Shared browser instance for performance
let browserInstance: Browser | null = null;

// Cache Three.js source code
let threeJsSource: string | null = null;

/**
 * Load Three.js source from node_modules
 * Uses Node.js module resolution to find the package
 */
function getThreeJsSource(): string {
  if (!threeJsSource) {
    try {
      // Use Node.js module resolution to find Three.js
      // The package.json "exports" maps "." to "./build/three.cjs" for require
      const threeJsPath = require.resolve('three');
      const cjsSource = readFileSync(threeJsPath, 'utf-8');
      
      // Wrap the CJS module to expose THREE globally in the browser context
      threeJsSource = `
        (function() {
          var module = { exports: {} };
          var exports = module.exports;
          ${cjsSource}
          window.THREE = module.exports;
        })();
      `;
    } catch (error) {
      throw new Error(`Could not find Three.js: ${error instanceof Error ? error.message : error}`);
    }
  }
  return threeJsSource;
}

/**
 * Check if we're running in a CI environment
 */
function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.JENKINS_URL ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI
  );
}

/**
 * Get or create a shared browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    // Disable sandbox in CI environments or when running as root
    // CI environments like GitHub Actions have restrictions that prevent Chrome's sandbox
    const isRoot = process.getuid?.() === 0;
    const needsNoSandbox = isRoot || isCI();
    
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        // Disable sandbox in CI or when running as root
        ...(needsNoSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
        // Prevent crashes in Docker/constrained environments
        '--disable-dev-shm-usage',
        // Enable WebGL with software rendering (no GPU required)
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-webgl',
      ],
    });
  }
  return browserInstance;
}

/**
 * Close the shared browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Render a floorplan as a 3D PNG using Puppeteer
 */
export async function renderWithPuppeteer(
  jsonData: JsonExport,
  options: Render3DOptions = {}
): Promise<Render3DResult> {
  const width = options.width ?? 800;
  const height = options.height ?? 600;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set viewport to match output dimensions
    await page.setViewport({ width, height });

    // Create a minimal HTML page
    const html = createRenderingHTML(width, height);
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    // Inject Three.js from node_modules
    await page.addScriptTag({ content: getThreeJsSource() });

    // Wait for Three.js to be available
    await page.waitForFunction('typeof THREE !== "undefined"', {
      timeout: 10000,
    });

    // Add our rendering code
    await page.addScriptTag({ content: getRenderingCode() });

    // Wait for render function to be available
    await page.waitForFunction('typeof window.renderFloorplan === "function"', {
      timeout: 5000,
    });

    // Pass data and options to the page and render
    const result = await page.evaluate(
      `(async () => {
        const jsonData = ${JSON.stringify(jsonData)};
        const options = ${JSON.stringify(options)};
        return await window.renderFloorplan(jsonData, options);
      })()`
    ) as {
      projection: 'isometric' | 'perspective';
      sceneBounds: Render3DResult['metadata']['sceneBounds'];
      floorsRendered: number[];
      cameraPosition?: [number, number, number];
      cameraTarget?: [number, number, number];
      fov?: number;
    };

    // Capture the canvas as PNG
    const canvasHandle = await page.$('canvas');
    if (!canvasHandle) {
      throw new Error('Canvas not found');
    }

    const pngBuffer = await canvasHandle.screenshot({
      type: 'png',
      omitBackground: false,
    });

    // Parse the result
    const metadata: Render3DResult['metadata'] = {
      format: '3d-png',
      projection: result.projection,
      width,
      height,
      sceneBounds: result.sceneBounds,
      floorsRendered: result.floorsRendered,
    };

    if (result.projection === 'perspective') {
      metadata.cameraPosition = result.cameraPosition;
      metadata.cameraTarget = result.cameraTarget;
      metadata.fov = result.fov;
    }

    return {
      pngBuffer: Buffer.from(pngBuffer),
      metadata,
    };
  } finally {
    await page.close();
  }
}

/**
 * Create the base HTML page (without Three.js - that's injected separately)
 */
function createRenderingHTML(width: number, height: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; background: #f5f5f7; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="canvas" width="${width}" height="${height}"></canvas>
</body>
</html>`;
}

/**
 * Get the rendering code to inject
 */
function getRenderingCode(): string {
  return `
    // Color constants
    const COLORS = {
      FLOOR: 0xe0e0e0,
      WALL: 0x909090,
      WINDOW: 0x88ccff,
      DOOR: 0x8b4513,
      BACKGROUND: 0xf5f5f7,
    };

    const COLORS_DARK = {
      FLOOR: 0x3d3d3d,
      WALL: 0x6d6d6d,
      WINDOW: 0x4488cc,
      DOOR: 0x5c3317,
      BACKGROUND: 0x1a1a2e,
    };

    const COLORS_BLUEPRINT = {
      FLOOR: 0x1e3a5f,
      WALL: 0x87ceeb,
      WINDOW: 0xadd8e6,
      DOOR: 0xb8d4e8,
      BACKGROUND: 0x0d2137,
    };

    const DIMENSIONS = {
      WALL: { THICKNESS: 0.2, HEIGHT: 3.35 },
      FLOOR: { THICKNESS: 0.2 },
    };

    function getThemeColors(theme) {
      if (theme === 'dark') return COLORS_DARK;
      if (theme === 'blueprint') return COLORS_BLUEPRINT;
      return COLORS;
    }

    function resolveTheme(config) {
      if (!config) return 'light';
      if (config.theme === 'dark' || config.darkMode) return 'dark';
      if (config.theme === 'blueprint') return 'blueprint';
      return 'light';
    }

    function computeSceneBounds(scene) {
      const box = new THREE.Box3().setFromObject(scene);
      if (box.isEmpty()) {
        return {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 10, y: 5, z: 10 },
          center: { x: 5, y: 2.5, z: 5 },
          size: { x: 10, y: 5, z: 10 },
        };
      }
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      return {
        min: { x: box.min.x, y: box.min.y, z: box.min.z },
        max: { x: box.max.x, y: box.max.y, z: box.max.z },
        center: { x: center.x, y: center.y, z: center.z },
        size: { x: size.x, y: size.y, z: size.z },
      };
    }

    function setupIsometricCamera(bounds, aspectRatio) {
      const { center, size } = bounds;
      const maxDimension = Math.max(size.x, size.z) * 1.2;
      const height = Math.max(size.y, maxDimension * 0.5) * 1.2;
      const angle = Math.PI / 6;
      const distance = maxDimension * 1.5;

      const camX = center.x + distance * Math.cos(Math.PI / 4);
      const camY = center.y + distance * Math.sin(angle) + height / 2;
      const camZ = center.z + distance * Math.sin(Math.PI / 4);

      const frustumSize = maxDimension;
      const halfWidth = (frustumSize * aspectRatio) / 2;
      const halfHeight = frustumSize / 2;

      const camera = new THREE.OrthographicCamera(
        -halfWidth, halfWidth, halfHeight, -halfHeight, 0.1, distance * 3
      );
      camera.position.set(camX, camY, camZ);
      camera.lookAt(center.x, center.y, center.z);
      camera.updateProjectionMatrix();

      return {
        camera,
        position: [camX, camY, camZ],
        target: [center.x, center.y, center.z],
      };
    }

    function setupPerspectiveCamera(options, bounds, aspectRatio) {
      const { center, size } = bounds;
      const fov = options.fov || 50;
      const defaultDistance = Math.max(size.x, size.y, size.z) * 2;

      const position = options.cameraPosition || [
        center.x + defaultDistance,
        center.y + defaultDistance * 0.6,
        center.z + defaultDistance,
      ];
      const target = options.cameraTarget || [center.x, center.y, center.z];

      const camera = new THREE.PerspectiveCamera(fov, aspectRatio, 0.1, defaultDistance * 5);
      camera.position.set(...position);
      camera.lookAt(...target);
      camera.updateProjectionMatrix();

      return { camera, position, target, fov };
    }

    // Connection rendering functions
    function findMatchingConnections(room, wall, allConnections) {
      const matches = [];
      for (const conn of allConnections) {
        let isMatch = false;
        let isFromRoom = false;

        if (conn.fromRoom === room.name && conn.fromWall === wall.direction) {
          isMatch = true;
          isFromRoom = true;
        } else if (conn.toRoom === room.name && conn.toWall === wall.direction) {
          isMatch = true;
          isFromRoom = false;
        }

        if (isMatch) {
          const otherRoomName = isFromRoom ? conn.toRoom : conn.fromRoom;
          const otherWallDirection = isFromRoom ? conn.toWall : conn.fromWall;
          matches.push({ connection: conn, isFromRoom, otherRoomName, otherWallDirection });
        }
      }
      return matches;
    }

    function shouldRenderConnection(match, currentWall, allRooms) {
      const { isFromRoom, otherRoomName, otherWallDirection } = match;

      let otherWallType = 'solid';
      const otherRoom = allRooms.find(r => r.name === otherRoomName);

      if (otherRoom) {
        const otherWall = otherRoom.walls.find(w => w.direction === otherWallDirection);
        if (otherWall) {
          otherWallType = otherWall.type;
        }
      } else {
        if (!isFromRoom) {
          otherWallType = 'solid';
        } else {
          otherWallType = 'open';
        }
      }

      const isCurrentOpen = currentWall.type === 'open';
      const isOtherOpen = otherWallType === 'open';

      if (isCurrentOpen && isOtherOpen) {
        return isFromRoom;
      } else if (isCurrentOpen) {
        return false;
      } else if (isOtherOpen) {
        return true;
      } else {
        return isFromRoom;
      }
    }

    function generateConnections(floor, allConnections, config, floorGroup, themeColors) {
      const DOOR_DIMS = {
        WIDTH: 1.0,
        HEIGHT: 2.1,
        PANEL_THICKNESS: 0.05,
        SWING_ANGLE: Math.PI / 4,
      };
      const DOUBLE_DOOR_WIDTH = 1.8;
      const WINDOW_DIMS = {
        WIDTH: 1.5,
        HEIGHT: 1.2,
        SILL_HEIGHT: 0.9,
        GLASS_THICKNESS: 0.05,
      };

      const wallThickness = config.wall_thickness || DIMENSIONS.WALL.THICKNESS;
      const defaultHeight = config.default_height || DIMENSIONS.WALL.HEIGHT;

      floor.rooms.forEach(room => {
        room.walls.forEach(wall => {
          const matches = findMatchingConnections(room, wall, allConnections);

          matches.forEach(match => {
            if (!shouldRenderConnection(match, wall, floor.rooms)) {
              return;
            }

            const conn = match.connection;
            const isDoor = conn.doorType === 'door' || conn.doorType === 'double-door';
            const isWindow = conn.doorType === 'window';

            if (!isDoor && !isWindow) return;

            // Calculate position
            const isVertical = wall.direction === 'left' || wall.direction === 'right';
            const positionPercent = conn.position || 50;
            const positionFraction = positionPercent / 100;

            const roomHeight = room.roomHeight || defaultHeight;
            const roomElevation = room.elevation || 0;

            let holeX, holeZ;
            if (isVertical) {
              holeX = wall.direction === 'left' ? room.x : room.x + room.width;
              holeZ = room.z + positionFraction * room.height;
            } else {
              holeX = room.x + positionFraction * room.width;
              holeZ = wall.direction === 'top' ? room.z : room.z + room.height;
            }

            if (isDoor) {
              // Door rendering
              let doorWidth = conn.width !== undefined ? conn.width :
                conn.doorType === 'double-door' ? DOUBLE_DOOR_WIDTH : DOOR_DIMS.WIDTH;
              const doorHeight = conn.height || DOOR_DIMS.HEIGHT;

              const doorPanelGeom = new THREE.BoxGeometry(
                doorWidth,
                doorHeight,
                DOOR_DIMS.PANEL_THICKNESS
              );
              doorPanelGeom.translate(doorWidth / 2, 0, 0);

              const doorMat = new THREE.MeshStandardMaterial({
                color: themeColors.DOOR,
                roughness: 0.7,
                metalness: 0.0,
              });

              const doorMesh = new THREE.Mesh(doorPanelGeom, doorMat);
              doorMesh.name = 'door-' + conn.fromRoom + '-' + conn.toRoom;

              // Calculate hinge position
              const swingRight = conn.swing !== 'left';
              let hingeSideSign = 0;
              switch (wall.direction) {
                case 'top': hingeSideSign = swingRight ? 1 : -1; break;
                case 'bottom': hingeSideSign = swingRight ? -1 : 1; break;
                case 'left': hingeSideSign = swingRight ? -1 : 1; break;
                case 'right': hingeSideSign = swingRight ? 1 : -1; break;
              }

              let hingeX = holeX;
              let hingeZ = holeZ;
              if (isVertical) {
                hingeZ = holeZ + hingeSideSign * (doorWidth / 2);
              } else {
                hingeX = holeX + hingeSideSign * (doorWidth / 2);
              }

              doorMesh.position.set(hingeX, roomElevation + doorHeight / 2, hingeZ);

              // Calculate rotation
              let baseAngle = 0;
              if (!isVertical) {
                baseAngle = hingeSideSign === 1 ? Math.PI : 0;
              } else {
                baseAngle = hingeSideSign === 1 ? Math.PI / 2 : -Math.PI / 2;
              }

              const opensIn = conn.opensInto ? conn.opensInto === room.name : true;
              let wallFactor = 1;
              if (wall.direction === 'bottom' || wall.direction === 'left') {
                wallFactor = -1;
              }
              const openFactor = opensIn ? 1 : -1;
              const swingDir = hingeSideSign * wallFactor * openFactor;
              const finalAngle = baseAngle + swingDir * DOOR_DIMS.SWING_ANGLE;

              doorMesh.rotation.y = finalAngle;
              floorGroup.add(doorMesh);

            } else if (isWindow) {
              // Window rendering
              const windowWidth = conn.width || WINDOW_DIMS.WIDTH;
              const windowHeight = conn.height || WINDOW_DIMS.HEIGHT;
              const sillHeight = roomElevation + WINDOW_DIMS.SILL_HEIGHT;

              const windowGeom = new THREE.BoxGeometry(
                isVertical ? WINDOW_DIMS.GLASS_THICKNESS : windowWidth,
                windowHeight,
                isVertical ? windowWidth : WINDOW_DIMS.GLASS_THICKNESS
              );

              const windowMat = new THREE.MeshStandardMaterial({
                color: themeColors.WINDOW,
                roughness: 0.0,
                metalness: 0.9,
                transparent: true,
                opacity: 0.3,
              });

              const windowMesh = new THREE.Mesh(windowGeom, windowMat);
              windowMesh.name = 'window-' + conn.fromRoom + '-' + conn.toRoom;
              windowMesh.position.set(holeX, sillHeight + windowHeight / 2, holeZ);
              floorGroup.add(windowMesh);
            }
          });
        });
      });
    }

    // StairGenerator class for proper stair/lift 3D geometry
    class StairGenerator {
      constructor() {
        this.material = new THREE.MeshStandardMaterial({
          color: 0xa0a0a0,
          roughness: 0.6,
          metalness: 0.1,
        });
      }

      generateStair(stair) {
        const group = new THREE.Group();
        group.name = 'stair_' + stair.name;
        group.position.set(stair.x, 0, stair.z);

        const shapeType = stair.shape?.type || 'straight';
        switch (shapeType) {
          case 'straight':
            this._generateStraightStair(group, stair);
            break;
          case 'L-shaped':
            this._generateLShapedStair(group, stair);
            break;
          case 'U-shaped':
            this._generateUShapedStair(group, stair);
            break;
          case 'spiral':
            this._generateSpiralStair(group, stair);
            break;
          default:
            this._generateStraightStair(group, stair);
        }
        return group;
      }

      generateLift(lift, floorHeight) {
        const group = new THREE.Group();
        group.name = 'lift_' + lift.name;
        group.position.set(lift.x, 0, lift.z);

        const width = lift.width;
        const depth = lift.height;
        
        // Lift shaft - semi-transparent box
        const geometry = new THREE.BoxGeometry(width, floorHeight, depth);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
          color: 0x888888,
          transparent: true,
          opacity: 0.3,
          roughness: 0.1,
          metalness: 0.5,
        }));
        mesh.position.y = floorHeight / 2;
        group.add(mesh);

        // Door indicators (view-relative: top/bottom/left/right)
        if (lift.doors) {
          lift.doors.forEach(dir => {
            const doorGeom = new THREE.BoxGeometry(
              (dir === 'top' || dir === 'bottom') ? width * 0.8 : 0.22,
              floorHeight * 0.8,
              (dir === 'right' || dir === 'left') ? depth * 0.8 : 0.22
            );
            const doorMesh = new THREE.Mesh(doorGeom, new THREE.MeshStandardMaterial({ color: 0x333333 }));
            doorMesh.position.y = floorHeight / 2;
            if (dir === 'top') doorMesh.position.z = -depth / 2;
            if (dir === 'bottom') doorMesh.position.z = depth / 2;
            if (dir === 'right') doorMesh.position.x = width / 2;
            if (dir === 'left') doorMesh.position.x = -width / 2;
            group.add(doorMesh);
          });
        }
        return group;
      }

      _generateStraightStair(group, stair) {
        const rise = stair.rise || 3;
        const riserHeight = stair.riser || 0.18;
        const treadDepth = stair.tread || 0.28;
        const width = stair.width || 1.0;

        const stepCount = Math.round(rise / riserHeight);
        const actualRiser = rise / stepCount;

        // Direction handling (view-relative: top/bottom/left/right)
        let rotation = 0;
        const direction = stair.shape?.direction || 'top';
        switch (direction) {
          case 'top': rotation = 0; break;
          case 'bottom': rotation = Math.PI; break;
          case 'right': rotation = -Math.PI / 2; break;
          case 'left': rotation = Math.PI / 2; break;
        }

        // Create steps
        for (let i = 0; i < stepCount; i++) {
          const stepGroup = new THREE.Group();

          // Tread
          const treadGeom = new THREE.BoxGeometry(width, 0.05, treadDepth);
          const tread = new THREE.Mesh(treadGeom, this.material);
          tread.position.y = (i + 1) * actualRiser;
          tread.castShadow = true;
          tread.receiveShadow = true;
          stepGroup.add(tread);

          // Riser (if closed or glass)
          if (stair.stringers !== 'open') {
            let riserMat = this.material;
            if (stair.stringers === 'glass') {
              riserMat = new THREE.MeshStandardMaterial({
                color: 0x88ccff,
                transparent: true,
                opacity: 0.5,
                roughness: 0.1,
                metalness: 0.9
              });
            }
            const riserGeom = new THREE.BoxGeometry(width, actualRiser, 0.02);
            const riser = new THREE.Mesh(riserGeom, riserMat);
            riser.position.y = (i + 0.5) * actualRiser;
            riser.position.z = treadDepth / 2;
            stepGroup.add(riser);
          }

          stepGroup.position.z = -(i * treadDepth) - (treadDepth / 2);
          group.add(stepGroup);
        }

        group.rotation.y = rotation;

        // Handrails
        if (stair.handrail && stair.handrail !== 'none') {
          const totalDepth = stepCount * treadDepth;
          const totalHeight = stepCount * actualRiser;
          const postMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.2 });
          const railHeight = 0.9;

          const addHandrail = (xPos) => {
            // Bottom post
            const postGeom = new THREE.CylinderGeometry(0.02, 0.02, railHeight);
            const post1 = new THREE.Mesh(postGeom, postMat);
            post1.position.set(xPos, railHeight / 2, 0);
            group.add(post1);

            // Top post
            const post2 = new THREE.Mesh(postGeom, postMat);
            post2.position.set(xPos, totalHeight + railHeight / 2, -totalDepth);
            group.add(post2);

            // Rail
            const railLength = Math.sqrt(totalDepth * totalDepth + totalHeight * totalHeight);
            const railGeom = new THREE.CylinderGeometry(0.02, 0.02, railLength);
            const rail = new THREE.Mesh(railGeom, postMat);
            rail.position.set(xPos, totalHeight / 2 + railHeight, -totalDepth / 2);
            rail.rotation.x = Math.atan2(totalHeight, totalDepth);
            group.add(rail);
          };

          if (stair.handrail === 'both' || stair.handrail === 'left') addHandrail(-width / 2);
          if (stair.handrail === 'both' || stair.handrail === 'right') addHandrail(width / 2);
        }
      }

      _generateLShapedStair(group, stair) {
        const runs = stair.shape?.runs || [10, 10];
        const run1Steps = runs[0] || Math.floor((stair.rise || 3) / 0.18 / 2);
        const run2Steps = runs[1] || Math.floor((stair.rise || 3) / 0.18 / 2);
        const treadDepth = stair.tread || 0.28;
        const width = stair.width || 1.0;
        const actualRiser = (stair.rise || 3) / (run1Steps + run2Steps);

        // First run
        for (let i = 0; i < run1Steps; i++) {
          const treadGeom = new THREE.BoxGeometry(width, 0.05, treadDepth);
          const tread = new THREE.Mesh(treadGeom, this.material);
          tread.position.set(0, (i + 1) * actualRiser, -(i * treadDepth) - (treadDepth / 2));
          group.add(tread);
        }

        // Landing
        const landingY = run1Steps * actualRiser;
        const landingDepth = stair.shape?.landing ? stair.shape.landing[1] : width;
        const landingWidth = stair.shape?.landing ? stair.shape.landing[0] : width;
        const landingGeom = new THREE.BoxGeometry(landingWidth, 0.05, landingDepth);
        const landing = new THREE.Mesh(landingGeom, this.material);
        landing.position.set(0, landingY, -(run1Steps * treadDepth) - (landingDepth / 2) + (treadDepth / 2));
        group.add(landing);

        // Second run (turned)
        const turn = stair.shape?.turn || 'right';
        const turnAngle = turn === 'right' ? -Math.PI / 2 : Math.PI / 2;
        const run2Group = new THREE.Group();
        run2Group.position.set(0, landingY, -(run1Steps * treadDepth) - (landingDepth / 2) + (treadDepth / 2));
        run2Group.rotation.y = turnAngle;

        for (let i = 0; i < run2Steps; i++) {
          const treadGeom = new THREE.BoxGeometry(width, 0.05, treadDepth);
          const tread = new THREE.Mesh(treadGeom, this.material);
          tread.position.set(0, (i + 1) * actualRiser, -(landingDepth / 2 + treadDepth / 2) - (i * treadDepth) - (treadDepth / 2));
          run2Group.add(tread);
        }
        group.add(run2Group);

        // Apply entry rotation (view-relative: top/bottom/left/right)
        const entry = stair.shape?.entry || 'top';
        let rotation = 0;
        switch (entry) {
          case 'top': rotation = 0; break;
          case 'bottom': rotation = Math.PI; break;
          case 'right': rotation = -Math.PI / 2; break;
          case 'left': rotation = Math.PI / 2; break;
        }
        group.rotation.y = rotation;
      }

      _generateUShapedStair(group, stair) {
        // Simplified: render as straight for now
        this._generateStraightStair(group, stair);
      }

      _generateSpiralStair(group, stair) {
        const rise = stair.rise || 3;
        const riserHeight = stair.riser || 0.18;
        const stepCount = Math.round(rise / riserHeight);
        const actualRiser = rise / stepCount;

        const outerRadius = stair.shape?.outerRadius || 1.0;
        const innerRadius = stair.shape?.innerRadius || 0.1;
        const stepWidth = outerRadius - innerRadius;

        const rotationDir = stair.shape?.rotation === 'counterclockwise' ? 1 : -1;
        const anglePerStep = (Math.PI * 2) / 12 * rotationDir;

        for (let i = 0; i < stepCount; i++) {
          const stepGroup = new THREE.Group();
          const treadGeom = new THREE.BoxGeometry(stepWidth, 0.05, 0.3);
          const tread = new THREE.Mesh(treadGeom, this.material);
          tread.position.x = innerRadius + stepWidth / 2;
          tread.position.y = (i + 1) * actualRiser;
          stepGroup.add(tread);
          stepGroup.rotation.y = i * anglePerStep;
          group.add(stepGroup);
        }
      }
    }

    function buildScene(jsonData, options) {
      const theme = resolveTheme(jsonData.config);
      const themeColors = getThemeColors(theme);
      
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(themeColors.BACKGROUND);

      // Build style map
      const styleMap = new Map();
      if (jsonData.styles) {
        jsonData.styles.forEach(s => styleMap.set(s.name, s));
      }

      // Determine floors to render
      const config = jsonData.config || {};
      const defaultHeight = config.default_height || DIMENSIONS.WALL.HEIGHT;
      const floorThickness = config.floor_thickness || DIMENSIONS.FLOOR.THICKNESS;
      const wallThickness = config.wall_thickness || DIMENSIONS.WALL.THICKNESS;

      const floorIndices = options.renderAllFloors
        ? undefined
        : [options.floorIndex || 0];
      
      const floorsToRender = floorIndices
        ? jsonData.floors.filter((_, i) => floorIndices.includes(i))
        : jsonData.floors;

      const floorsRendered = floorsToRender.map(f => f.index);

      // Calculate floor positions
      let currentY = 0;
      const floorPositions = new Map();
      jsonData.floors.forEach(floor => {
        floorPositions.set(floor.index, currentY);
        const floorHeight = floor.height || defaultHeight;
        currentY += floorHeight + floorThickness;
      });

      // Render floors
      floorsToRender.forEach(floor => {
        const floorGroup = new THREE.Group();
        floorGroup.name = 'floor_' + floor.id;
        floorGroup.position.y = floorPositions.get(floor.index) || 0;

        const floorHeight = floor.height || defaultHeight;

        // Render rooms
        floor.rooms.forEach(room => {
          const roomStyle = room.style && styleMap.has(room.style) 
            ? styleMap.get(room.style) 
            : null;

          // Floor slab
          const floorColor = roomStyle?.floor_color 
            ? parseInt(roomStyle.floor_color.replace('#', ''), 16) 
            : themeColors.FLOOR;
          
          const floorGeom = new THREE.BoxGeometry(room.width, floorThickness, room.height);
          const floorMat = new THREE.MeshStandardMaterial({ 
            color: floorColor,
            roughness: 0.8,
            metalness: 0.1,
          });
          const floorMesh = new THREE.Mesh(floorGeom, floorMat);
          floorMesh.position.set(
            room.x + room.width / 2,
            (room.elevation || 0),
            room.z + room.height / 2
          );
          floorMesh.receiveShadow = true;
          floorGroup.add(floorMesh);

          // Walls
          const wallColor = roomStyle?.wall_color
            ? parseInt(roomStyle.wall_color.replace('#', ''), 16)
            : themeColors.WALL;
          const wallMat = new THREE.MeshStandardMaterial({
            color: wallColor,
            roughness: 0.5,
            metalness: 0,
          });

          const roomHeight = room.roomHeight || floorHeight;

          room.walls.forEach(wall => {
            if (wall.type === 'open') return;

            let width, depth, posX, posZ;
            const isVertical = wall.direction === 'left' || wall.direction === 'right';

            if (isVertical) {
              width = wallThickness;
              depth = room.height;
              posX = wall.direction === 'left' 
                ? room.x + wallThickness / 2 
                : room.x + room.width - wallThickness / 2;
              posZ = room.z + room.height / 2;
            } else {
              width = room.width;
              depth = wallThickness;
              posX = room.x + room.width / 2;
              posZ = wall.direction === 'top'
                ? room.z + wallThickness / 2
                : room.z + room.height - wallThickness / 2;
            }

            const wallGeom = new THREE.BoxGeometry(width, roomHeight, depth);
            const wallMesh = new THREE.Mesh(wallGeom, wallMat);
            wallMesh.position.set(posX, (room.elevation || 0) + roomHeight / 2, posZ);
            wallMesh.castShadow = true;
            wallMesh.receiveShadow = true;
            floorGroup.add(wallMesh);
          });
        });

        // Connections (doors and windows)
        if (jsonData.connections) {
          generateConnections(floor, jsonData.connections, config, floorGroup, themeColors);
        }

        // Stairs - using StairGenerator for proper geometry
        if (floor.stairs) {
          const stairGen = new StairGenerator();
          floor.stairs.forEach(stair => {
            const stairGroup = stairGen.generateStair(stair);
            floorGroup.add(stairGroup);
          });
        }

        // Lifts - using StairGenerator for proper geometry
        if (floor.lifts) {
          const stairGen = new StairGenerator();
          floor.lifts.forEach(lift => {
            const liftGroup = stairGen.generateLift(lift, floorHeight);
            floorGroup.add(liftGroup);
          });
        }

        scene.add(floorGroup);
      });

      return { scene, floorsRendered };
    }

    function setupLighting(scene, bounds) {
      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambient);

      const directional = new THREE.DirectionalLight(0xffffff, 0.8);
      const maxDim = Math.max(bounds.size.x, bounds.size.y, bounds.size.z);
      directional.position.set(
        bounds.center.x + maxDim,
        bounds.center.y + maxDim * 1.5,
        bounds.center.z + maxDim
      );
      directional.target.position.set(bounds.center.x, bounds.center.y, bounds.center.z);
      scene.add(directional);
      scene.add(directional.target);
    }

    // Main render function exposed to Puppeteer
    window.renderFloorplan = async function(jsonData, options) {
      const canvas = document.getElementById('canvas');
      const width = options.width || 800;
      const height = options.height || 600;

      // Build scene
      const { scene, floorsRendered } = buildScene(jsonData, options);
      const bounds = computeSceneBounds(scene);

      // Setup camera
      const projection = options.projection || 'isometric';
      const aspectRatio = width / height;
      
      let cameraResult;
      if (projection === 'perspective') {
        cameraResult = setupPerspectiveCamera(options, bounds, aspectRatio);
      } else {
        cameraResult = setupIsometricCamera(bounds, aspectRatio);
      }

      // Setup lighting
      setupLighting(scene, bounds);

      // Create renderer
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(1);

      // Render
      renderer.render(scene, cameraResult.camera);

      // Return metadata
      return {
        projection,
        sceneBounds: bounds,
        floorsRendered,
        cameraPosition: cameraResult.position,
        cameraTarget: cameraResult.target,
        fov: cameraResult.fov,
      };
    };
  `;
}
