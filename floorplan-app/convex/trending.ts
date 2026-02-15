import { internalMutation } from './_generated/server';

export interface TrendingScoreParams {
  views_7d: number;
  forks_7d: number;
  views_30d: number;
  forks_30d: number;
  createdAt: number;
  now: number;
}

export function calculateTrendingScore(params: TrendingScoreParams): number {
  const { views_7d, forks_7d, views_30d, forks_30d, createdAt, now } = params;

  const recent = views_7d * 1.0 + forks_7d * 5.0;
  const older = views_30d * 0.3 + forks_30d * 1.5;
  const rawScore = recent + older;

  const age_days = (now - createdAt) / (1000 * 60 * 60 * 24);
  const score = rawScore / (1 + age_days * 0.1);

  return score;
}

export const calculateTrendingScores = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const projects = await ctx.db.query('projects').collect();

    for (const project of projects) {
      const views_30d = project.viewCount ?? 0;
      const forks_30d = project.forkCount ?? 0;

      const views_7d = views_30d;
      const forks_7d = forks_30d;

      const trendingScore = calculateTrendingScore({
        views_7d,
        forks_7d,
        views_30d,
        forks_30d,
        createdAt: project.createdAt,
        now,
      });

      await ctx.db.patch(project._id, {
        trendingScore,
        lastTrendingCalc: now,
      });
    }
  },
});
