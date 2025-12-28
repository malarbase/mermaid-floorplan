/**
 * Floorplan diagram styles for Mermaid theming
 * Following Mermaid's theming conventions
 * 
 * This function is called by Mermaid's styling engine to get
 * diagram-specific CSS. Theme options are passed as an argument.
 */

export interface FloorplanThemeOptions {
  // Floor colors
  floorBackground?: string;
  floorBorder?: string;
  
  // Room colors  
  roomBackground?: string;
  roomBorder?: string;
  
  // Wall colors
  wallColor?: string;
  wallStroke?: string;
  
  // Door/Window colors
  doorFill?: string;
  doorStroke?: string;
  windowFill?: string;
  windowStroke?: string;
  
  // Text colors
  textColor?: string;
  labelColor?: string;
  sizeColor?: string;
  
  // Font settings
  fontFamily?: string;
  fontSize?: string;
}

// Default theme options
export const defaultThemeOptions: FloorplanThemeOptions = {
  floorBackground: "#eed",
  floorBorder: "#000",
  roomBackground: "transparent",
  roomBorder: "#000",
  wallColor: "#000",
  wallStroke: "#000",
  doorFill: "#fff",
  doorStroke: "#000",
  windowFill: "#fff",
  windowStroke: "#000",
  textColor: "#000",
  labelColor: "#000",
  sizeColor: "#666",
  fontFamily: "Arial, sans-serif",
  fontSize: "0.8",
};

/**
 * Get CSS styles for floorplan diagrams
 * This follows Mermaid's theming pattern
 */
export function getStyles(options: Partial<FloorplanThemeOptions> = {}): string {
  const opts = { ...defaultThemeOptions, ...options };

  return `
    /* Floor background */
    .floor-background {
      fill: ${opts.floorBackground};
      stroke: ${opts.floorBorder};
      stroke-width: 0.1;
    }

    /* Room container */
    .room {
      /* Room styling handled by walls */
    }

    /* Wall styling */
    .wall {
      fill: ${opts.wallColor};
      stroke: ${opts.wallStroke};
      stroke-width: 0.05;
    }

    /* Door styling */
    .door {
      fill: ${opts.doorFill};
      stroke: ${opts.doorStroke};
      stroke-width: 0.05;
    }

    /* Window styling */
    .window {
      fill: ${opts.windowFill};
      stroke: ${opts.windowStroke};
      stroke-width: 0.01;
    }

    /* Text styling */
    .room-name {
      fill: ${opts.textColor};
      font-family: ${opts.fontFamily};
      font-size: ${opts.fontSize};
    }

    .room-label {
      fill: ${opts.labelColor};
      font-family: ${opts.fontFamily};
      font-size: ${opts.fontSize};
    }

    .room-size {
      fill: ${opts.sizeColor};
      font-family: ${opts.fontFamily};
      font-size: 0.7;
    }
  `;
}

// Dark theme preset
export const darkTheme: FloorplanThemeOptions = {
  floorBackground: "#2d2d2d",
  floorBorder: "#888",
  wallColor: "#ccc",
  wallStroke: "#ccc",
  doorFill: "#444",
  doorStroke: "#ccc",
  windowFill: "#555",
  windowStroke: "#ccc",
  textColor: "#eee",
  labelColor: "#ddd",
  sizeColor: "#999",
};

// Blueprint theme preset
export const blueprintTheme: FloorplanThemeOptions = {
  floorBackground: "#1a365d",
  floorBorder: "#4299e1",
  wallColor: "#4299e1",
  wallStroke: "#4299e1",
  doorFill: "#1a365d",
  doorStroke: "#63b3ed",
  windowFill: "#1a365d",
  windowStroke: "#63b3ed",
  textColor: "#e2e8f0",
  labelColor: "#bee3f8",
  sizeColor: "#90cdf4",
};

