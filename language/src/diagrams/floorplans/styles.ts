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

/**
 * Theme registry mapping theme names to theme options
 */
export const themeRegistry: Record<string, FloorplanThemeOptions> = {
  'default': defaultThemeOptions,
  'dark': darkTheme,
  'blueprint': blueprintTheme,
};

/**
 * Get theme options by name
 * @param name Theme name ('default', 'dark', 'blueprint')
 * @returns Theme options or undefined if not found
 */
export function getThemeByName(name: string): FloorplanThemeOptions | undefined {
  return themeRegistry[name];
}

/**
 * Check if a theme name is valid
 */
export function isValidTheme(name: string): boolean {
  return name in themeRegistry;
}

/**
 * Get list of available theme names
 */
export function getAvailableThemes(): string[] {
  return Object.keys(themeRegistry);
}

/**
 * Config key normalization - maps snake_case to camelCase
 * Aligns floorplan DSL conventions with Mermaid.js camelCase style
 */
const CONFIG_KEY_MAP: Record<string, string> = {
  // Dimension properties
  'wall_thickness': 'wallThickness',
  'floor_thickness': 'floorThickness',
  'default_height': 'defaultHeight',
  'door_width': 'doorWidth',
  'door_height': 'doorHeight',
  'door_size': 'doorSize',
  'window_width': 'windowWidth',
  'window_height': 'windowHeight',
  'window_sill': 'windowSill',
  'window_size': 'windowSize',
  // Style and unit properties
  'default_style': 'defaultStyle',
  'default_unit': 'defaultUnit',
  'area_unit': 'areaUnit',
  // Theme properties
  'dark_mode': 'darkMode',
  // Font properties
  'font_family': 'fontFamily',
  'font_size': 'fontSize',
  // Display properties
  'show_labels': 'showLabels',
  'show_dimensions': 'showDimensions',
  // Stair building code
  'stair_code': 'stairCode',
};

/**
 * Normalize a config key from snake_case to camelCase
 * If already camelCase or unknown, returns as-is
 */
export function normalizeConfigKey(key: string): string {
  return CONFIG_KEY_MAP[key] ?? key;
}

/**
 * Normalize all keys in a config object
 */
export function normalizeConfigKeys<T extends Record<string, unknown>>(config: T): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    normalized[normalizeConfigKey(key)] = value;
  }
  return normalized;
}

