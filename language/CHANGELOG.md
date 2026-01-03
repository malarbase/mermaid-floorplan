# Floorplan Grammar Changelog

All notable changes to the floorplan DSL grammar will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-01

### Added
- Initial grammar version with core features:
  - Floor and room definitions with positioning
  - Wall specifications (solid, door, window, open)
  - Connections between rooms with door types
  - Style blocks for material customization
  - Configuration system for global settings
  - Variable definitions for dimensions
  - Relative positioning of rooms
  - Support for both metric and imperial units
  - Theme support (default, dark, blueprint)

- **Grammar Versioning System** (from `add-grammar-versioning` proposal):
  - Version declaration via YAML frontmatter:
    ```floorplan
    ---
    version: "1.0"
    ---
    floorplan
      ...
    ```
  - Version declaration via inline directive:
    ```floorplan
    %%{version: 1.0}%%
    floorplan
      ...
    ```
  - Semantic versioning support (MAJOR.MINOR.PATCH)
  - Version validation and compatibility checking
  - Warning for missing version declarations (defaults to current version)
  - Error for unsupported/future versions

- **Deprecation System**:
  - Deprecation warnings for features scheduled for removal
  - Migration guidance in warning messages
  - Deprecation registry tracking feature lifecycle

### Config Properties
- `wall_thickness` / `wallThickness` - Wall thickness dimension
- `floor_thickness` / `floorThickness` - Floor slab thickness
- `default_height` / `defaultHeight` - Default room/floor height
- `door_width` / `doorWidth` - Default door width
- `door_height` / `doorHeight` - Default door height
- `door_size` / `doorSize` - Default door size (width x height)
- `window_width` / `windowWidth` - Default window width
- `window_height` / `windowHeight` - Default window height
- `window_sill` / `windowSill` - Window sill height from floor
- `window_size` / `windowSize` - Default window size (width x height)
- `default_style` / `defaultStyle` - Default material style reference
- `default_unit` / `defaultUnit` - Default length unit (m, ft, cm, in, mm)
- `area_unit` / `areaUnit` - Area display unit (sqft, sqm)
- `theme` - Visual theme (default, dark, blueprint)
- `darkMode` / `dark_mode` - Enable dark mode (boolean)
- `fontFamily` / `font_family` - Font family for labels
- `fontSize` / `font_size` - Font size for labels
- `showLabels` / `show_labels` - Display room labels (boolean)
- `showDimensions` / `show_dimensions` - Display dimensions (boolean)

### Planned Deprecations (Future Versions)
The following features are planned for deprecation in version 1.1.0 and removal in version 2.0.0:
- `door_width` and `door_height` → Use `door_size: (width x height)` instead
- `window_width` and `window_height` → Use `window_size: (width x height)` instead

## [Unreleased]

### Future Enhancements
- Migration CLI tool for automated version upgrades
- Additional built-in themes
- Enhanced validation for complex room layouts
- Support for curved walls and non-rectangular rooms

---

## Version History

- **1.0.0** - Initial release with versioning system (2025-01-01)
