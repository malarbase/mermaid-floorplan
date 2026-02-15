import { describe, expect, test } from 'vitest';
import { calculateTrendingScore } from './trending';

describe('calculateTrendingScore', () => {
  test('calculates basic score with views and forks', () => {
    const now = Date.now();
    const createdAt = now - 24 * 60 * 60 * 1000; // 1 day old

    const score = calculateTrendingScore({
      views_7d: 10,
      forks_7d: 2,
      views_30d: 30,
      forks_30d: 5,
      createdAt,
      now,
    });

    // Expected calculation:
    // recent = (10 * 1.0) + (2 * 5.0) = 10 + 10 = 20
    // older = (30 * 0.3) + (5 * 1.5) = 9 + 7.5 = 16.5
    // raw = 20 + 16.5 = 36.5
    // age_days = 1
    // score = 36.5 / (1 + 1 * 0.1) = 36.5 / 1.1 ≈ 33.18
    expect(score).toBeCloseTo(33.18, 2);
  });

  test('applies time decay for older projects', () => {
    const now = Date.now();
    const createdAt = now - 100 * 24 * 60 * 60 * 1000; // 100 days old

    const score = calculateTrendingScore({
      views_7d: 10,
      forks_7d: 2,
      views_30d: 30,
      forks_30d: 5,
      createdAt,
      now,
    });

    // Same raw score = 36.5
    // age_days = 100
    // score = 36.5 / (1 + 100 * 0.1) = 36.5 / 11 ≈ 3.32
    expect(score).toBeCloseTo(3.32, 2);
  });

  test('handles zero views and forks', () => {
    const now = Date.now();
    const createdAt = now - 24 * 60 * 60 * 1000; // 1 day old

    const score = calculateTrendingScore({
      views_7d: 0,
      forks_7d: 0,
      views_30d: 0,
      forks_30d: 0,
      createdAt,
      now,
    });

    // raw = 0
    // score = 0 / 1.1 = 0
    expect(score).toBe(0);
  });

  test('recent activity weighs more than older activity', () => {
    const now = Date.now();
    const createdAt = now - 24 * 60 * 60 * 1000; // 1 day old

    const score1 = calculateTrendingScore({
      views_7d: 10,
      forks_7d: 0,
      views_30d: 10,
      forks_30d: 0,
      createdAt,
      now,
    });

    const score2 = calculateTrendingScore({
      views_7d: 0,
      forks_7d: 0,
      views_30d: 10,
      forks_30d: 0,
      createdAt,
      now,
    });

    // score1: (10 * 1.0) + (10 * 0.3) = 10 + 3 = 13
    // score2: (0 * 1.0) + (10 * 0.3) = 0 + 3 = 3
    expect(score1).toBeGreaterThan(score2);
  });

  test('forks weigh more than views', () => {
    const now = Date.now();
    const createdAt = now - 24 * 60 * 60 * 1000; // 1 day old

    const scoreViews = calculateTrendingScore({
      views_7d: 10,
      forks_7d: 0,
      views_30d: 10,
      forks_30d: 0,
      createdAt,
      now,
    });

    const _scoreForks = calculateTrendingScore({
      views_7d: 0,
      forks_7d: 2,
      views_30d: 0,
      forks_30d: 2,
      createdAt,
      now,
    });

    // scoreViews: (10 * 1.0) + (10 * 0.3) = 13 / 1.1 ≈ 11.82
    // scoreForks: (2 * 5.0) + (2 * 1.5) = 10 + 3 = 13 / 1.1 ≈ 11.82
    // They're equal! Let me fix this test to show forks weight more

    const scoreForks2 = calculateTrendingScore({
      views_7d: 0,
      forks_7d: 3,
      views_30d: 0,
      forks_30d: 3,
      createdAt,
      now,
    });

    // scoreForks2: (3 * 5.0) + (3 * 1.5) = 15 + 4.5 = 19.5 / 1.1 ≈ 17.73
    expect(scoreForks2).toBeGreaterThan(scoreViews);
  });

  test('new projects have no time decay penalty', () => {
    const now = Date.now();
    const createdAt = now; // Just created

    const score = calculateTrendingScore({
      views_7d: 10,
      forks_7d: 2,
      views_30d: 30,
      forks_30d: 5,
      createdAt,
      now,
    });

    // age_days = 0
    // score = 36.5 / (1 + 0 * 0.1) = 36.5 / 1 = 36.5
    expect(score).toBe(36.5);
  });
});
