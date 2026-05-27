/**
 * Aesthetic and presentation rules: themes, colors, materials, and styles.
 *
 * These rules check the visual design and rendering quality of the floorplan —
 * ensuring custom styles are defined and consistently applied to all rooms, stairs,
 * and lifts so the visual output feels professional, colored, and harmonious.
 */

import { f } from './geometry.mjs';

export const aestheticRules = {
  style_usage(ctx) {
    const findings = [];
    const styles = ctx.styles ?? [];
    const config = ctx.config ?? {};

    // Check 1: Global Style Absence
    // If no custom styles are defined and there's no custom theme
    const theme = config.theme;
    const hasTheme = theme && theme !== 'default';

    if (styles.length === 0 && !hasTheme) {
      findings.push(
        f(
          'style_usage',
          'warning',
          "Styling recommendation: No custom 'style' blocks or global themes are defined in this floorplan. Consider adding styled colors/materials for premium visual aesthetics.",
          [],
          { stylesCount: 0, theme: theme ?? null },
          'add style blocks (e.g. style Living { floor_color: "#E6F2FF" }) or configure a global theme like `config { theme: dark }`',
        ),
      );
      return findings;
    }

    // Check 2: Element-Level Style Absence
    // If custom style blocks exist but no default_style is defined, check every element (room, stair, lift) on this floor.
    const defaultStyle = config.default_style;
    if (styles.length > 0 && !defaultStyle) {
      // 1. Check rooms
      for (const room of ctx.rooms ?? []) {
        if (!room.style) {
          findings.push(
            f(
              'style_usage',
              'warning',
              `Room "${room.name}" has no style reference applied. Consider assigning a style reference or setting a global 'default_style' in config.`,
              [room.name],
              { elementName: room.name, elementType: 'room' },
              `add a style block reference (e.g., style <StyleName>) to the declaration of "${room.name}", or set a global 'default_style' in config`,
            ),
          );
        }
      }

      // 2. Check stairs
      for (const stair of ctx.stairs ?? []) {
        if (!stair.style) {
          findings.push(
            f(
              'style_usage',
              'warning',
              `Stair "${stair.name}" has no style reference applied. Consider assigning a style reference or setting a global 'default_style' in config.`,
              [stair.name],
              { elementName: stair.name, elementType: 'stair' },
              `add a style block reference (e.g., style <StyleName>) to the declaration of "${stair.name}", or set a global 'default_style' in config`,
            ),
          );
        }
      }

      // 3. Check lifts
      for (const lift of ctx.lifts ?? []) {
        if (!lift.style) {
          findings.push(
            f(
              'style_usage',
              'warning',
              `Lift "${lift.name}" has no style reference applied. Consider assigning a style reference or setting a global 'default_style' in config.`,
              [lift.name],
              { elementName: lift.name, elementType: 'lift' },
              `add a style block reference (e.g., style <StyleName>) to the declaration of "${lift.name}", or set a global 'default_style' in config`,
            ),
          );
        }
      }
    }

    return findings;
  },
};
