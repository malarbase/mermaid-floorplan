/**
 * Window rendering utilities for floorplan SVG generation
 * Following Mermaid diagram conventions
 */

export function generateWindow(
  x: number,
  y: number,
  width: number,
  height: number,
  wallDirection?: string
): string {
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  let windowWidth: number;
  let windowHeight: number;

  if (width > height) {
    // Horizontal wall
    windowWidth = Math.min(width * 0.8, width - 0.2);
    windowHeight = 0.1;
  } else {
    // Vertical wall
    windowWidth = 0.1;
    windowHeight = Math.min(height * 0.8, height - 0.2);
  }

  const windowX = centerX - windowWidth / 2;
  const windowY = centerY - windowHeight / 2;

  return `<rect x="${windowX}" y="${windowY}" width="${windowWidth}" height="${windowHeight}" 
    class="window" fill="white" stroke="black" stroke-width="0.01" data-type="window" data-direction="${wallDirection}" />`;
}

