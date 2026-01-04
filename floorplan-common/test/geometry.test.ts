import { describe, expect, test } from 'vitest';
import {
  calculateWallOverlap,
  calculatePositionOnOverlap,
  calculatePositionWithFallback,
  type RoomBounds,
} from '../src/geometry.js';

describe('Geometry Utils', () => {
  describe('calculateWallOverlap', () => {
    test('should detect horizontal wall overlap', () => {
      const roomA: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const roomB: RoomBounds = { x: 5, y: 10, width: 10, height: 10 };

      const overlap = calculateWallOverlap(roomA, roomB, false);

      expect(overlap).not.toBeNull();
      expect(overlap!.start).toBe(5);
      expect(overlap!.end).toBe(10);
      expect(overlap!.length).toBe(5);
    });

    test('should detect vertical wall overlap', () => {
      const roomA: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const roomB: RoomBounds = { x: 10, y: 3, width: 10, height: 10 };

      const overlap = calculateWallOverlap(roomA, roomB, true);

      expect(overlap).not.toBeNull();
      expect(overlap!.start).toBe(3);
      expect(overlap!.end).toBe(10);
      expect(overlap!.length).toBe(7);
    });

    test('should return null when no overlap', () => {
      const roomA: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const roomB: RoomBounds = { x: 20, y: 0, width: 10, height: 10 };

      const overlap = calculateWallOverlap(roomA, roomB, false);

      expect(overlap).toBeNull();
    });

    test('should detect full overlap when rooms share same X range', () => {
      const roomA: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const roomB: RoomBounds = { x: 0, y: 10, width: 10, height: 10 };

      // Rooms stacked vertically share full horizontal wall overlap
      const overlap = calculateWallOverlap(roomA, roomB, false);
      expect(overlap).not.toBeNull();
      expect(overlap!.start).toBe(0);
      expect(overlap!.end).toBe(10);
    });
  });

  describe('calculatePositionOnOverlap', () => {
    test('should calculate position at 50% of overlap', () => {
      const roomA: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const roomB: RoomBounds = { x: 0, y: 10, width: 10, height: 10 };

      // Full overlap on horizontal walls
      const position = calculatePositionOnOverlap(roomA, roomB, false, 50);

      expect(position).toBe(5); // Middle of overlap (0 to 10)
    });

    test('should calculate position at 0% of overlap', () => {
      const roomA: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const roomB: RoomBounds = { x: 0, y: 10, width: 10, height: 10 };

      const position = calculatePositionOnOverlap(roomA, roomB, false, 0);

      expect(position).toBe(0);
    });

    test('should calculate position at 100% of overlap', () => {
      const roomA: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const roomB: RoomBounds = { x: 0, y: 10, width: 10, height: 10 };

      const position = calculatePositionOnOverlap(roomA, roomB, false, 100);

      expect(position).toBe(10);
    });

    test('should return null when no overlap', () => {
      const roomA: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const roomB: RoomBounds = { x: 20, y: 0, width: 10, height: 10 };

      const position = calculatePositionOnOverlap(roomA, roomB, false, 50);

      expect(position).toBeNull();
    });
  });

  describe('calculatePositionWithFallback', () => {
    test('should use overlap calculation when target room provided', () => {
      const roomA: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const roomB: RoomBounds = { x: 0, y: 10, width: 10, height: 10 };

      const position = calculatePositionWithFallback(roomA, roomB, false, 50);

      expect(position).toBe(5);
    });

    test('should fallback to full wall when target room is null', () => {
      const roomA: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };

      const position = calculatePositionWithFallback(roomA, null, false, 50);

      expect(position).toBe(5); // 50% of width 10
    });

    test('should fallback when no overlap exists', () => {
      const roomA: RoomBounds = { x: 0, y: 0, width: 10, height: 10 };
      const roomB: RoomBounds = { x: 100, y: 100, width: 10, height: 10 };

      const position = calculatePositionWithFallback(roomA, roomB, false, 50);

      expect(position).toBe(5); // Falls back to 50% of source width
    });

    test('should handle vertical walls', () => {
      const roomA: RoomBounds = { x: 0, y: 0, width: 10, height: 20 };

      const position = calculatePositionWithFallback(roomA, null, true, 50);

      expect(position).toBe(10); // 50% of height 20
    });
  });
});

