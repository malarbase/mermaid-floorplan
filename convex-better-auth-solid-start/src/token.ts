/**
 * Token utility for SSR - fetches a Convex-compatible JWT
 * from the Better Auth instance running inside Convex.
 */
import { getToken } from '@convex-dev/better-auth/utils';

export async function getConvexToken(
  convexSiteUrl: string,
  request: Request,
): Promise<string | null> {
  const result = await getToken(convexSiteUrl, request.headers);
  return result?.token ?? null;
}
