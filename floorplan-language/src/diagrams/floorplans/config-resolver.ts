/**
 * Config resolution utilities
 * 
 * Extracts and normalizes configuration from floorplan DSL,
 * supporting both snake_case and camelCase property names.
 */

import type { Floorplan, ConfigProperty } from "../../generated/ast.js";
import { normalizeConfigKey, getThemeByName, type FloorplanThemeOptions } from "./styles.js";

/**
 * Parsed configuration object with normalized keys (Mermaid-aligned)
 * Supports both snake_case and camelCase properties from DSL
 */
export interface ParsedConfig {
  // Theme
  theme?: string;
  darkMode?: boolean;
  
  // Dimensions
  wallThickness?: number;
  floorThickness?: number;
  defaultHeight?: number;
  doorWidth?: number;
  doorHeight?: number;
  doorSize?: { width: number; height: number };
  windowWidth?: number;
  windowHeight?: number;
  windowSill?: number;
  windowSize?: { width: number; height: number };
  
  // Style
  defaultStyle?: string;
  defaultUnit?: string;
  areaUnit?: string;
  
  // Font (Mermaid-aligned)
  fontFamily?: string;
  fontSize?: number;
  
  // Display toggles
  showLabels?: boolean;
  showDimensions?: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: ParsedConfig = {
  wallThickness: 0.2,
  floorThickness: 0.2,
  defaultHeight: 3.35,
  doorWidth: 1.0,
  doorHeight: 2.1,
  windowWidth: 1.5,
  windowHeight: 1.5,
  windowSill: 0.9,
  defaultUnit: 'ft',
  areaUnit: 'sqft',
  fontFamily: 'Arial, sans-serif',
  fontSize: 0.8,
  showLabels: true,
  showDimensions: false,
};

/**
 * Extract value from a ConfigProperty
 */
function extractPropertyValue(prop: ConfigProperty): unknown {
  // Check each possible value type
  if (prop.themeRef !== undefined) return prop.themeRef;
  if (prop.boolValue !== undefined) return prop.boolValue === 'true';
  if (prop.stringValue !== undefined) {
    // Remove quotes from string value
    const str = prop.stringValue;
    if ((str.startsWith('"') && str.endsWith('"')) ||
        (str.startsWith("'") && str.endsWith("'"))) {
      return str.slice(1, -1);
    }
    return str;
  }
  if (prop.value !== undefined) return prop.value;
  if (prop.dimension !== undefined) {
    return {
      width: prop.dimension.width.value,
      height: prop.dimension.height.value,
    };
  }
  if (prop.unitRef !== undefined) return prop.unitRef;
  if (prop.areaUnitRef !== undefined) return prop.areaUnitRef;
  if (prop.styleRef !== undefined) return prop.styleRef;
  
  return undefined;
}

/**
 * Extract and normalize configuration from a floorplan
 */
export function resolveConfig(floorplan: Floorplan): ParsedConfig {
  const config: ParsedConfig = { ...DEFAULT_CONFIG };
  
  if (!floorplan.config) {
    return config;
  }
  
  for (const prop of floorplan.config.properties) {
    const normalizedKey = normalizeConfigKey(prop.name);
    const value = extractPropertyValue(prop);
    
    if (value !== undefined) {
      // Type-safe assignment based on key
      switch (normalizedKey) {
        case 'theme':
          config.theme = value as string;
          break;
        case 'darkMode':
          config.darkMode = value as boolean;
          break;
        case 'wallThickness':
          config.wallThickness = value as number;
          break;
        case 'floorThickness':
          config.floorThickness = value as number;
          break;
        case 'defaultHeight':
          config.defaultHeight = value as number;
          break;
        case 'doorWidth':
          config.doorWidth = value as number;
          break;
        case 'doorHeight':
          config.doorHeight = value as number;
          break;
        case 'doorSize':
          config.doorSize = value as { width: number; height: number };
          break;
        case 'windowWidth':
          config.windowWidth = value as number;
          break;
        case 'windowHeight':
          config.windowHeight = value as number;
          break;
        case 'windowSill':
          config.windowSill = value as number;
          break;
        case 'windowSize':
          config.windowSize = value as { width: number; height: number };
          break;
        case 'defaultStyle':
          config.defaultStyle = value as string;
          break;
        case 'defaultUnit':
          config.defaultUnit = value as string;
          break;
        case 'areaUnit':
          config.areaUnit = value as string;
          break;
        case 'fontFamily':
          config.fontFamily = value as string;
          break;
        case 'fontSize':
          config.fontSize = value as number;
          break;
        case 'showLabels':
          config.showLabels = value as boolean;
          break;
        case 'showDimensions':
          config.showDimensions = value as boolean;
          break;
      }
    }
  }
  
  return config;
}

/**
 * Resolve theme options from config
 * Handles both explicit 'theme' and 'darkMode' toggle
 */
export function resolveThemeOptions(config: ParsedConfig): Partial<FloorplanThemeOptions> {
  let themeOptions: Partial<FloorplanThemeOptions> = {};
  
  // Determine theme name
  let themeName = 'default';
  
  if (config.theme) {
    // Explicit theme takes precedence
    themeName = config.theme;
  } else if (config.darkMode === true) {
    // darkMode: true defaults to 'dark' theme
    themeName = 'dark';
  }
  
  // Get base theme options
  const baseTheme = getThemeByName(themeName);
  if (baseTheme) {
    themeOptions = { ...baseTheme };
  }
  
  // Override with explicit font settings
  if (config.fontFamily) {
    themeOptions.fontFamily = config.fontFamily;
  }
  if (config.fontSize !== undefined) {
    themeOptions.fontSize = String(config.fontSize);
  }
  
  return themeOptions;
}

/**
 * Get the effective theme name from config
 */
export function getEffectiveThemeName(config: ParsedConfig): string {
  if (config.theme) {
    return config.theme;
  }
  if (config.darkMode === true) {
    return 'dark';
  }
  return 'default';
}

