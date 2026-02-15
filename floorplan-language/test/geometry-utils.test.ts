/**
 * Tests for shared geometry utilities
 * These utilities are used by both SVG (2D) and 3D renderers
 */

import { describe, expect, it } from 'vitest';
import {
  calculatePositionOnOverlap,
  calculatePositionOnWallOverlap,
  calculatePositionWithFallback,
  calculateWallBoundsOverlap,
  calculateWallOverlap,
  type RoomBounds,
  type WallBounds,
} from '../src/diagrams/floorplans/geometry-utils.js';

describe('geometry-utils', () => {
  describe('calculateWallOverlap', () => {
    it('should calculate overlap for horizontal walls (same width rooms)', () => {
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const targetRoom: RoomBounds = { x: 0, y: 10, width: 10, height: 10 };

      const overlap = calculateWallOverlap(sourceRoom, targetRoom, false);

      expect(overlap).not.toBeNull();
      expect(overlap!.start).toBe(0);
      expect(overlap!.end).toBe(10);
      expect(overlap!.length).toBe(10);
    });

    it('should calculate overlap for horizontal walls (offset rooms)', () => {
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const targetRoom: RoomBounds = { x: 5, y: 10, width: 10, height: 10 };

      const overlap = calculateWallOverlap(sourceRoom, targetRoom, false);

      expect(overlap).not.toBeNull();
      expect(overlap!.start).toBe(5);
      expect(overlap!.end).toBe(10);
      expect(overlap!.length).toBe(5);
    });

    it('should calculate overlap for vertical walls (same height rooms)', () => {
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const targetRoom: RoomBounds = { x: 10, y: 0, width: 10, height: 10 };

      const overlap = calculateWallOverlap(sourceRoom, targetRoom, true);

      expect(overlap).not.toBeNull();
      expect(overlap!.start).toBe(0);
      expect(overlap!.end).toBe(10);
      expect(overlap!.length).toBe(10);
    });

    it('should calculate overlap for vertical walls (offset rooms)', () => {
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const targetRoom: RoomBounds = { x: 10, y: 3, width: 10, height: 10 };

      const overlap = calculateWallOverlap(sourceRoom, targetRoom, true);

      expect(overlap).not.toBeNull();
      expect(overlap!.start).toBe(3);
      expect(overlap!.end).toBe(10);
      expect(overlap!.length).toBe(7);
    });

    it("should return null when rooms don't overlap horizontally", () => {
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const targetRoom: RoomBounds = { x: 15, y: 10, width: 10, height: 10 };

      const overlap = calculateWallOverlap(sourceRoom, targetRoom, false);

      expect(overlap).toBeNull();
    });

    it("should return null when rooms don't overlap vertically", () => {
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const targetRoom: RoomBounds = { x: 10, y: 15, width: 10, height: 10 };

      const overlap = calculateWallOverlap(sourceRoom, targetRoom, true);

      expect(overlap).toBeNull();
    });

    it('should handle partial overlap (target smaller than source)', () => {
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 20, height: 10 };
      const targetRoom: RoomBounds = { x: 5, y: 10, width: 5, height: 10 };

      const overlap = calculateWallOverlap(sourceRoom, targetRoom, false);

      expect(overlap).not.toBeNull();
      expect(overlap!.start).toBe(5);
      expect(overlap!.end).toBe(10);
      expect(overlap!.length).toBe(5);
    });

    it('should handle real-world case: adjacent rooms with partial overlap', () => {
      // Simulating a living room with two adjacent rooms below (kitchen + passage)
      // Living room: x=0, width=20 (spans full width)
      // Kitchen: x=10, width=10 (right half of living room's bottom)
      // Passage: x=0, width=10 (left half of living room's bottom)
      const livingRoom: RoomBounds = { x: 0, y: 0, width: 20, height: 12 };
      const kitchen: RoomBounds = { x: 10, y: 12, width: 10, height: 10 };
      const passage: RoomBounds = { x: 0, y: 12, width: 10, height: 10 };

      // Living to Kitchen: should overlap right half
      const kitchenOverlap = calculateWallOverlap(livingRoom, kitchen, false);
      expect(kitchenOverlap).not.toBeNull();
      expect(kitchenOverlap!.start).toBe(10);
      expect(kitchenOverlap!.end).toBe(20);
      expect(kitchenOverlap!.length).toBe(10);

      // Living to Passage: should overlap left half
      const passageOverlap = calculateWallOverlap(livingRoom, passage, false);
      expect(passageOverlap).not.toBeNull();
      expect(passageOverlap!.start).toBe(0);
      expect(passageOverlap!.end).toBe(10);
      expect(passageOverlap!.length).toBe(10);

      // 50% in kitchen overlap = x=15
      const kitchenDoorPos = calculatePositionOnOverlap(livingRoom, kitchen, false, 50);
      expect(kitchenDoorPos).toBe(15);

      // 50% in passage overlap = x=5
      const passageDoorPos = calculatePositionOnOverlap(livingRoom, passage, false, 50);
      expect(passageDoorPos).toBe(5);
    });
  });

  describe('calculatePositionOnOverlap', () => {
    it('should calculate 50% position on overlap', () => {
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const targetRoom: RoomBounds = { x: 0, y: 10, width: 10, height: 10 };

      const position = calculatePositionOnOverlap(sourceRoom, targetRoom, false, 50);

      expect(position).toBe(5); // 50% of 10 units starting at 0
    });

    it('should calculate 50% position on partial overlap', () => {
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const targetRoom: RoomBounds = { x: 5, y: 10, width: 10, height: 10 };

      const position = calculatePositionOnOverlap(sourceRoom, targetRoom, false, 50);

      // Overlap is from x=5 to x=10, so 50% should be at x=7.5
      expect(position).toBe(7.5);
    });

    it('should calculate 0% position (start of overlap)', () => {
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const targetRoom: RoomBounds = { x: 5, y: 10, width: 10, height: 10 };

      const position = calculatePositionOnOverlap(sourceRoom, targetRoom, false, 0);

      expect(position).toBe(5); // Start of overlap
    });

    it('should calculate 100% position (end of overlap)', () => {
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const targetRoom: RoomBounds = { x: 5, y: 10, width: 10, height: 10 };

      const position = calculatePositionOnOverlap(sourceRoom, targetRoom, false, 100);

      expect(position).toBe(10); // End of overlap
    });

    it('should return null when no overlap', () => {
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const targetRoom: RoomBounds = { x: 20, y: 10, width: 10, height: 10 };

      const position = calculatePositionOnOverlap(sourceRoom, targetRoom, false, 50);

      expect(position).toBeNull();
    });

    it('should handle vertical wall positions', () => {
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const targetRoom: RoomBounds = { x: 10, y: 2, width: 10, height: 6 };

      const position = calculatePositionOnOverlap(sourceRoom, targetRoom, true, 50);

      // Overlap is from y=2 to y=8, so 50% should be at y=5
      expect(position).toBe(5);
    });
  });

  describe('calculatePositionWithFallback', () => {
    it('should use shared segment when target room provided', () => {
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const targetRoom: RoomBounds = { x: 5, y: 10, width: 10, height: 10 };

      const position = calculatePositionWithFallback(sourceRoom, targetRoom, false, 50);

      // Should use overlap: 50% of [5, 10] = 7.5
      expect(position).toBe(7.5);
    });

    it('should fall back to full wall when no target room', () => {
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };

      const position = calculatePositionWithFallback(sourceRoom, null, false, 50);

      // Should use full wall: 50% of 10 = 5
      expect(position).toBe(5);
    });

    it('should fall back to full wall when target room has no overlap', () => {
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const targetRoom: RoomBounds = { x: 20, y: 10, width: 10, height: 10 };

      const position = calculatePositionWithFallback(sourceRoom, targetRoom, false, 50);

      // Should fall back to full wall: 50% of 10 = 5
      expect(position).toBe(5);
    });

    it('should handle vertical walls with fallback', () => {
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 10, height: 20 };

      const position = calculatePositionWithFallback(sourceRoom, null, true, 25);

      // 25% of height 20 = 5
      expect(position).toBe(5);
    });
  });

  describe('calculateWallBoundsOverlap (SVG renderer API)', () => {
    it('should calculate overlap for two horizontal walls', () => {
      const fromBounds: WallBounds = { x: 0, y: 10, length: 10, isHorizontal: true };
      const toBounds: WallBounds = { x: 5, y: 10, length: 10, isHorizontal: true };

      const overlap = calculateWallBoundsOverlap(fromBounds, toBounds);

      expect(overlap).not.toBeNull();
      expect(overlap!.start).toBe(5);
      expect(overlap!.end).toBe(10);
      expect(overlap!.length).toBe(5);
    });

    it('should calculate overlap for two vertical walls', () => {
      const fromBounds: WallBounds = { x: 10, y: 0, length: 10, isHorizontal: false };
      const toBounds: WallBounds = { x: 10, y: 3, length: 10, isHorizontal: false };

      const overlap = calculateWallBoundsOverlap(fromBounds, toBounds);

      expect(overlap).not.toBeNull();
      expect(overlap!.start).toBe(3);
      expect(overlap!.end).toBe(10);
      expect(overlap!.length).toBe(7);
    });

    it('should return null for mixed orientation walls', () => {
      const fromBounds: WallBounds = { x: 0, y: 10, length: 10, isHorizontal: true };
      const toBounds: WallBounds = { x: 10, y: 0, length: 10, isHorizontal: false };

      const overlap = calculateWallBoundsOverlap(fromBounds, toBounds);

      expect(overlap).toBeNull();
    });

    it('should return null for non-overlapping horizontal walls', () => {
      const fromBounds: WallBounds = { x: 0, y: 10, length: 5, isHorizontal: true };
      const toBounds: WallBounds = { x: 10, y: 10, length: 5, isHorizontal: true };

      const overlap = calculateWallBoundsOverlap(fromBounds, toBounds);

      expect(overlap).toBeNull();
    });
  });

  describe('calculatePositionOnWallOverlap (SVG renderer API)', () => {
    it('should calculate position on horizontal wall overlap', () => {
      const fromBounds: WallBounds = { x: 0, y: 10, length: 10, isHorizontal: true };
      const toBounds: WallBounds = { x: 0, y: 10, length: 10, isHorizontal: true };

      const position = calculatePositionOnWallOverlap(fromBounds, toBounds, 50);

      expect(position).toBe(5);
    });

    it('should calculate position on partial horizontal overlap', () => {
      const fromBounds: WallBounds = { x: 0, y: 10, length: 10, isHorizontal: true };
      const toBounds: WallBounds = { x: 5, y: 10, length: 10, isHorizontal: true };

      const position = calculatePositionOnWallOverlap(fromBounds, toBounds, 50);

      // Overlap [5, 10], 50% = 7.5
      expect(position).toBe(7.5);
    });

    it('should calculate position on vertical wall overlap', () => {
      const fromBounds: WallBounds = { x: 10, y: 0, length: 10, isHorizontal: false };
      const toBounds: WallBounds = { x: 10, y: 2, length: 6, isHorizontal: false };

      const position = calculatePositionOnWallOverlap(fromBounds, toBounds, 50);

      // Overlap [2, 8], 50% = 5
      expect(position).toBe(5);
    });

    it('should return null for no overlap', () => {
      const fromBounds: WallBounds = { x: 0, y: 10, length: 5, isHorizontal: true };
      const toBounds: WallBounds = { x: 10, y: 10, length: 5, isHorizontal: true };

      const position = calculatePositionOnWallOverlap(fromBounds, toBounds, 50);

      expect(position).toBeNull();
    });
  });

  describe('consistency between Room and Wall APIs', () => {
    it('should produce same results for equivalent inputs', () => {
      // Room-based calculation (3D style)
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const targetRoom: RoomBounds = { x: 5, y: 10, width: 10, height: 10 };

      // Wall-based calculation (SVG style) - simulating bottom wall of sourceRoom
      const fromWall: WallBounds = { x: 0, y: 10, length: 10, isHorizontal: true };
      const toWall: WallBounds = { x: 5, y: 10, length: 10, isHorizontal: true };

      const roomPosition = calculatePositionOnOverlap(sourceRoom, targetRoom, false, 50);
      const wallPosition = calculatePositionOnWallOverlap(fromWall, toWall, 50);

      // Both should give the same result
      expect(roomPosition).toBe(wallPosition);
      expect(roomPosition).toBe(7.5);
    });

    it('should handle edge case: touching at single point', () => {
      // Rooms that touch at exactly one point
      const sourceRoom: RoomBounds = { x: 0, y: 0, width: 5, height: 10 };
      const targetRoom: RoomBounds = { x: 5, y: 10, width: 10, height: 10 };

      const overlap = calculateWallOverlap(sourceRoom, targetRoom, false);

      // x ranges: source [0, 5], target [5, 15]
      // overlap at x=5, length=0
      expect(overlap).toBeNull(); // No real overlap (just a point)
    });
  });
});
