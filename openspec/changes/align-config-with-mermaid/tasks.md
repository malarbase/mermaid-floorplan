## 1. Grammar Updates

- [ ] 1.1 Add `theme` to CONFIG_KEY terminal rule (values: `default`, `dark`, `blueprint`)
- [ ] 1.2 Add `darkMode` / `dark_mode` to CONFIG_KEY (boolean value)
- [ ] 1.3 Add `fontFamily` / `font_family` to CONFIG_KEY (string value)
- [ ] 1.4 Add `fontSize` / `font_size` to CONFIG_KEY (number value)
- [ ] 1.5 Add `showLabels` / `show_labels` to CONFIG_KEY (boolean)
- [ ] 1.6 Add `showDimensions` / `show_dimensions` to CONFIG_KEY (boolean)
- [ ] 1.7 Update ConfigProperty to support boolean and string value types
- [ ] 1.8 Add camelCase alternatives to all CONFIG_KEY entries

## 2. Naming Convention Normalization

- [ ] 2.1 Create `normalizeConfigKey(key: string)` utility function
- [ ] 2.2 Map snake_case to camelCase (e.g., `wall_thickness` → `wallThickness`)
- [ ] 2.3 Accept both conventions in parser, normalize to camelCase internally
- [ ] 2.4 Update config resolution to use normalized keys

## 3. Theme Resolution

- [ ] 3.1 Create theme registry in `styles.ts` mapping theme names to `FloorplanThemeOptions`
- [ ] 3.2 Add `getThemeByName(name: string)` function
- [ ] 3.3 Update `renderer.ts` to read `theme` from parsed config block
- [ ] 3.4 Implement `darkMode` → theme resolution (`darkMode: true` = `theme: dark`)
- [ ] 3.5 Resolve theme options and pass to `getStyles()`

## 4. Font/Display Config Integration

- [ ] 4.1 Pass `fontFamily` from config to theme options
- [ ] 4.2 Pass `fontSize` from config to theme options
- [ ] 4.3 Pass `showLabels` from config to `RenderOptions`
- [ ] 4.4 Pass `showDimensions` from config to `RenderOptions`

## 5. YAML Frontmatter

- [ ] 5.1 Add YAML frontmatter detection regex (`/^---\n[\s\S]*?\n---/`)
- [ ] 5.2 Extract frontmatter before Langium parsing
- [ ] 5.3 Parse YAML to extract `title` and `config` sections
- [ ] 5.4 Normalize camelCase keys from frontmatter
- [ ] 5.5 Merge frontmatter config with inline config block (inline takes precedence)

## 6. 3D Viewer Theme Controls

- [ ] 6.1 Add dark theme color constants to `viewer/src/constants.ts`
  - `BACKGROUND_DARK: 0x1a1a2e` (dark background)
  - `GRID_COLOR_DARK`, `AMBIENT_LIGHT_DARK`, etc.
- [ ] 6.2 Create `ThemeManager` class in viewer to manage theme state
- [ ] 6.3 Add theme toggle button to viewer UI (sun/moon icon)
- [ ] 6.4 Implement `setTheme(theme: 'light' | 'dark')` method
- [ ] 6.5 Update `scene.background` dynamically on theme change
- [ ] 6.6 Update material colors for dark mode compatibility
- [ ] 6.7 Read `theme` or `darkMode` from parsed floorplan config
- [ ] 6.8 Apply DSL theme to viewer on load (respects `config { darkMode: true }`)
- [ ] 6.9 Add theme toggle to expanded controls panel

## 7. Validation

- [ ] 7.1 Add validation for unknown theme names (warning)
- [ ] 7.2 Add validation for fontSize must be positive number
- [ ] 7.3 Add validation for boolean properties must be `true` or `false`
- [ ] 7.4 Warn if both `theme` and `darkMode` are set (darkMode ignored when theme explicit)

## 8. Testing

- [ ] 8.1 Add parser tests for `config { theme: dark }`
- [ ] 8.2 Add parser tests for `config { darkMode: true }`
- [ ] 8.3 Add parser tests for camelCase config keys
- [ ] 8.4 Add parser tests for snake_case config keys (backward compat)
- [ ] 8.5 Add config normalization unit tests
- [ ] 8.6 Add renderer tests verifying theme CSS is applied
- [ ] 8.7 Add frontmatter parsing tests
- [ ] 8.8 Add 3D viewer theme toggle tests

## 9. Documentation

- [ ] 9.1 Update DSL reference in `openspec/project.md` with new config keys
- [ ] 9.2 Document camelCase/snake_case equivalence
- [ ] 9.3 Add frontmatter examples to `trial/` folder
- [ ] 9.4 Document 3D viewer theme controls
