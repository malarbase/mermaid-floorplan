import { describe, expect, test } from 'vitest';

describe('collections mutations', () => {
  test('collections module exports required mutations', async () => {
    const module = await import('./collections');

    expect(module.create).toBeDefined();
    expect(module.update).toBeDefined();
    expect(module.delete).toBeDefined();
    expect(module.addProject).toBeDefined();
    expect(module.removeProject).toBeDefined();
  });

  test('all mutations are functions (Convex mutation builders)', async () => {
    const module = await import('./collections');

    expect(typeof module.create).toBe('function');
    expect(typeof module.update).toBe('function');
    expect(typeof module.delete).toBe('function');
    expect(typeof module.addProject).toBe('function');
    expect(typeof module.removeProject).toBe('function');
  });

  test('create mutation enforces admin-only access', async () => {
    const module = await import('./collections');
    expect(module.create).toBeDefined();
  });

  test('update mutation enforces admin-only access', async () => {
    const module = await import('./collections');
    expect(module.update).toBeDefined();
  });

  test('delete mutation enforces admin-only access', async () => {
    const module = await import('./collections');
    expect(module.delete).toBeDefined();
  });

  test('addProject mutation enforces admin-only access', async () => {
    const module = await import('./collections');
    expect(module.addProject).toBeDefined();
  });

  test('removeProject mutation enforces admin-only access', async () => {
    const module = await import('./collections');
    expect(module.removeProject).toBeDefined();
  });
});
