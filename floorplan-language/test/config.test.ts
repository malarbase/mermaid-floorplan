/**
 * Tests for Mermaid-aligned configuration features
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { createFloorplansServices } from '../src/floorplans-module.js';
import type { Floorplan } from '../src/generated/ast.js';
import { 
  resolveConfig, 
  resolveThemeOptions, 
  getEffectiveThemeName,
  normalizeConfigKey,
  getThemeByName,
  isValidTheme,
  parseFrontmatter,
  hasFrontmatter,
  stripFrontmatter,
} from '../src/diagrams/floorplans/index.js';

describe('Config Key Normalization', () => {
  it('normalizes snake_case to camelCase', () => {
    expect(normalizeConfigKey('wall_thickness')).toBe('wallThickness');
    expect(normalizeConfigKey('font_family')).toBe('fontFamily');
    expect(normalizeConfigKey('show_labels')).toBe('showLabels');
    expect(normalizeConfigKey('dark_mode')).toBe('darkMode');
  });

  it('leaves camelCase unchanged', () => {
    expect(normalizeConfigKey('wallThickness')).toBe('wallThickness');
    expect(normalizeConfigKey('fontFamily')).toBe('fontFamily');
    expect(normalizeConfigKey('theme')).toBe('theme');
  });

  it('leaves unknown keys unchanged', () => {
    expect(normalizeConfigKey('customProp')).toBe('customProp');
    expect(normalizeConfigKey('unknown_key')).toBe('unknown_key');
  });
});

describe('Theme Registry', () => {
  it('returns theme by name', () => {
    const dark = getThemeByName('dark');
    expect(dark).toBeDefined();
    expect(dark?.floorBackground).toBe('#2d2d2d');
  });

  it('returns default theme', () => {
    const defaultTheme = getThemeByName('default');
    expect(defaultTheme).toBeDefined();
    expect(defaultTheme?.floorBackground).toBe('#eed');
  });

  it('returns blueprint theme', () => {
    const blueprint = getThemeByName('blueprint');
    expect(blueprint).toBeDefined();
    expect(blueprint?.floorBackground).toBe('#1a365d');
  });

  it('returns undefined for unknown theme', () => {
    expect(getThemeByName('nonexistent')).toBeUndefined();
  });

  it('validates theme names', () => {
    expect(isValidTheme('dark')).toBe(true);
    expect(isValidTheme('blueprint')).toBe(true);
    expect(isValidTheme('default')).toBe(true);
    expect(isValidTheme('unknown')).toBe(false);
  });
});

describe('Config Parsing', () => {
  let parse: ReturnType<typeof parseHelper<Floorplan>>;

  beforeAll(() => {
    const services = createFloorplansServices(EmptyFileSystem);
    parse = parseHelper<Floorplan>(services.Floorplans);
  });

  it('parses theme config', async () => {
    const doc = await parse(`
      floorplan
        config { theme: dark }
        floor f1 {
          room A at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `);
    
    const config = resolveConfig(doc.parseResult.value);
    expect(config.theme).toBe('dark');
  });

  it('parses darkMode config', async () => {
    const doc = await parse(`
      floorplan
        config { darkMode: true }
        floor f1 {
          room A at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `);
    
    const config = resolveConfig(doc.parseResult.value);
    expect(config.darkMode).toBe(true);
  });

  it('parses camelCase font config', async () => {
    const doc = await parse(`
      floorplan
        config { fontFamily: "Roboto, sans-serif", fontSize: 14 }
        floor f1 {
          room A at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `);
    
    const config = resolveConfig(doc.parseResult.value);
    expect(config.fontFamily).toBe('Roboto, sans-serif');
    expect(config.fontSize).toBe(14);
  });

  it('parses snake_case font config (backward compat)', async () => {
    const doc = await parse(`
      floorplan
        config { font_family: "Arial", font_size: 12 }
        floor f1 {
          room A at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `);
    
    const config = resolveConfig(doc.parseResult.value);
    expect(config.fontFamily).toBe('Arial');
    expect(config.fontSize).toBe(12);
  });

  it('parses showLabels config', async () => {
    const doc = await parse(`
      floorplan
        config { showLabels: false }
        floor f1 {
          room A at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `);
    
    const config = resolveConfig(doc.parseResult.value);
    expect(config.showLabels).toBe(false);
  });

  it('parses showDimensions config', async () => {
    const doc = await parse(`
      floorplan
        config { showDimensions: true }
        floor f1 {
          room A at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `);
    
    const config = resolveConfig(doc.parseResult.value);
    expect(config.showDimensions).toBe(true);
  });

  it('parses mixed snake_case and camelCase config', async () => {
    const doc = await parse(`
      floorplan
        config { theme: blueprint, wall_thickness: 0.3, showLabels: true }
        floor f1 {
          room A at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `);
    
    const config = resolveConfig(doc.parseResult.value);
    expect(config.theme).toBe('blueprint');
    expect(config.wallThickness).toBe(0.3);
    expect(config.showLabels).toBe(true);
  });
});

describe('Theme Resolution', () => {
  let parse: ReturnType<typeof parseHelper<Floorplan>>;

  beforeAll(() => {
    const services = createFloorplansServices(EmptyFileSystem);
    parse = parseHelper<Floorplan>(services.Floorplans);
  });

  it('resolves explicit theme', async () => {
    const doc = await parse(`
      floorplan
        config { theme: dark }
        floor f1 {
          room A at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `);
    
    const config = resolveConfig(doc.parseResult.value);
    const themeName = getEffectiveThemeName(config);
    expect(themeName).toBe('dark');
    
    const themeOptions = resolveThemeOptions(config);
    expect(themeOptions.floorBackground).toBe('#2d2d2d');
  });

  it('resolves darkMode to dark theme', async () => {
    const doc = await parse(`
      floorplan
        config { darkMode: true }
        floor f1 {
          room A at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `);
    
    const config = resolveConfig(doc.parseResult.value);
    const themeName = getEffectiveThemeName(config);
    expect(themeName).toBe('dark');
  });

  it('theme takes precedence over darkMode', async () => {
    const doc = await parse(`
      floorplan
        config { theme: blueprint, darkMode: true }
        floor f1 {
          room A at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `);
    
    const config = resolveConfig(doc.parseResult.value);
    const themeName = getEffectiveThemeName(config);
    expect(themeName).toBe('blueprint');
  });

  it('applies font overrides to theme', async () => {
    const doc = await parse(`
      floorplan
        config { theme: dark, fontFamily: "Roboto" }
        floor f1 {
          room A at (0,0) size (10 x 10) walls [top: solid, right: solid, bottom: solid, left: solid]
        }
    `);
    
    const config = resolveConfig(doc.parseResult.value);
    const themeOptions = resolveThemeOptions(config);
    expect(themeOptions.fontFamily).toBe('Roboto');
    expect(themeOptions.floorBackground).toBe('#2d2d2d'); // Still dark theme
  });
});

describe('Frontmatter Parsing', () => {
  it('detects frontmatter', () => {
    const input = `---
title: Test
---
floorplan
  floor f1 {}`;
    
    expect(hasFrontmatter(input)).toBe(true);
  });

  it('detects no frontmatter', () => {
    const input = `floorplan
  floor f1 {}`;
    
    expect(hasFrontmatter(input)).toBe(false);
  });

  it('parses title from frontmatter', () => {
    const input = `---
title: Villa Layout
---
floorplan
  floor f1 {}`;
    
    const result = parseFrontmatter(input);
    expect(result.hasFrontmatter).toBe(true);
    expect(result.title).toBe('Villa Layout');
  });

  it('parses config from frontmatter', () => {
    const input = `---
config:
  theme: dark
  wallThickness: 0.5
---
floorplan
  floor f1 {}`;
    
    const result = parseFrontmatter(input);
    expect(result.hasFrontmatter).toBe(true);
    expect(result.config.theme).toBe('dark');
    expect(result.config.wallThickness).toBe(0.5);
  });

  it('normalizes snake_case keys in frontmatter', () => {
    const input = `---
config:
  wall_thickness: 0.3
  font_family: Roboto
---
floorplan`;
    
    const result = parseFrontmatter(input);
    expect(result.config.wallThickness).toBe(0.3);
    expect(result.config.fontFamily).toBe('Roboto');
  });

  it('strips frontmatter from content', () => {
    const input = `---
title: Test
---
floorplan
  floor f1 {}`;
    
    const result = parseFrontmatter(input);
    expect(result.content.trim()).toBe(`floorplan
  floor f1 {}`);
  });

  it('returns original content when no frontmatter', () => {
    const input = `floorplan
  floor f1 {}`;
    
    const result = parseFrontmatter(input);
    expect(result.hasFrontmatter).toBe(false);
    expect(result.content).toBe(input);
    expect(result.config).toEqual({});
  });

  it('stripFrontmatter returns content only', () => {
    const input = `---
title: Test
---
floorplan`;
    
    const content = stripFrontmatter(input);
    expect(content.trim()).toBe('floorplan');
  });
});

