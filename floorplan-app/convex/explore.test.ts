import { describe, expect, test } from 'vitest';

describe('explore queries', () => {
  test('explore module exports expected queries', async () => {
    const exploreModule = await import('./explore');

    expect(exploreModule.listTrending).toBeDefined();
    expect(exploreModule.listByTopic).toBeDefined();
    expect(exploreModule.listFeatured).toBeDefined();
    expect(exploreModule.getCollection).toBeDefined();
    expect(exploreModule.listCollections).toBeDefined();
  });

  test('all queries are functions', async () => {
    const exploreModule = await import('./explore');

    expect(typeof exploreModule.listTrending).toBe('object');
    expect(typeof exploreModule.listByTopic).toBe('object');
    expect(typeof exploreModule.listFeatured).toBe('object');
    expect(typeof exploreModule.getCollection).toBe('object');
    expect(typeof exploreModule.listCollections).toBe('object');
  });
});
