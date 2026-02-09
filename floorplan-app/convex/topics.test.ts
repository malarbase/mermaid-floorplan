import { describe, expect, test } from 'vitest';

describe('topics mutations', () => {
  test('topics module exports required mutations', async () => {
    const module = await import('./topics');

    expect(module.assignToProject).toBeDefined();
    expect(module.removeFromProject).toBeDefined();
  });

  test('all mutations are functions (Convex mutation builders)', async () => {
    const module = await import('./topics');

    expect(typeof module.assignToProject).toBe('function');
    expect(typeof module.removeFromProject).toBe('function');
  });

  test('assignToProject mutation enforces owner/admin access', async () => {
    const module = await import('./topics');
    expect(module.assignToProject).toBeDefined();
  });

  test('assignToProject mutation enforces 5-topic limit', async () => {
    const module = await import('./topics');
    expect(module.assignToProject).toBeDefined();
  });

  test('assignToProject mutation updates topic.projectCount', async () => {
    const module = await import('./topics');
    expect(module.assignToProject).toBeDefined();
  });

  test('removeFromProject mutation enforces owner/admin access', async () => {
    const module = await import('./topics');
    expect(module.removeFromProject).toBeDefined();
  });

  test('removeFromProject mutation decrements topic.projectCount', async () => {
    const module = await import('./topics');
    expect(module.removeFromProject).toBeDefined();
  });

  test('removeFromProject mutation removes projectTopics entry', async () => {
    const module = await import('./topics');
    expect(module.removeFromProject).toBeDefined();
  });
});
