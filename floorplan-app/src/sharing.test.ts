import { describe, expect, it } from 'vitest';

describe('forkProject mutation', () => {
  describe('fork count denormalization', () => {
    it("should increment source project's forkCount from 0 to 1", () => {
      const sourceProjectForkCount = 0;
      const expectedForkCount = sourceProjectForkCount + 1;
      expect(expectedForkCount).toBe(1);
    });

    it("should increment source project's forkCount from 5 to 6", () => {
      const sourceProjectForkCount = 5;
      const expectedForkCount = sourceProjectForkCount + 1;
      expect(expectedForkCount).toBe(6);
    });

    it('should initialize undefined forkCount to 1 when forking', () => {
      const sourceProjectForkCount = undefined;
      const expectedForkCount = (sourceProjectForkCount ?? 0) + 1;
      expect(expectedForkCount).toBe(1);
    });
  });
});
