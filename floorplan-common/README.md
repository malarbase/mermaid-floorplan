# floorplan-common

Shared utilities for floorplan packages. Zero dependencies - pure TypeScript.

## Purpose

This package provides shared utilities used by both 2D (SVG) and 3D rendering:

- **Geometry utilities**: Wall overlap calculations, position calculations
- **Types**: Shared type definitions like `RoomBounds`

## Why a Separate Package?

The geometry utilities are needed by both:
- `floorplans-language` (2D/SVG rendering) - lightweight, no 3D dependencies
- `floorplan-3d-core` (3D rendering) - depends on Three.js

Keeping these utilities in a separate zero-dependency package ensures:
1. Users of `floorplans-language` don't pull in Three.js
2. Single source of truth for overlap calculations
3. Consistent behavior between 2D and 3D renderers

## Usage

```typescript
import {
  calculateWallOverlap,
  calculatePositionWithFallback,
  type RoomBounds,
} from 'floorplan-common';

const roomA: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
const roomB: RoomBounds = { x: 0, y: 10, width: 10, height: 10 };

// Calculate overlap between adjacent walls
const overlap = calculateWallOverlap(roomA, roomB, false);
// => { start: 0, end: 10, length: 10 }

// Calculate door position at 50% along shared wall
const position = calculatePositionWithFallback(roomA, roomB, false, 50);
// => 5
```

## API

### Types

- `RoomBounds` - Rectangular bounds `{ x, y, width, height }`
- `OverlapResult` - Overlap segment `{ start, end, length }`

### Functions

- `calculateWallOverlap(sourceRoom, targetRoom, isVertical)` - Calculate overlap segment
- `calculatePositionOnOverlap(sourceRoom, targetRoom, isVertical, percent)` - Position on overlap
- `calculatePositionWithFallback(sourceRoom, targetRoom, isVertical, percent)` - Position with fallback

