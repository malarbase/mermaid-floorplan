/**
 * Shared origin resolution for auth requests.
 *
 * Single source of truth for determining baseURL and trustedOrigins,
 * used by both convex/auth.ts and convex/http.ts.
 *
 * Security model:
 * - ALLOWED_ORIGINS env var: comma-separated hostnames/patterns (e.g. "floorplan-*.vercel.app")
 * - localhost/127.0.0.1 always allowed regardless of config
 * - Falls back to SITE_URL when origin is missing or disallowed
 */

export interface AuthOriginResult {
  baseURL: string;
  trustedOrigins: string[];
  validOrigin: boolean;
}

const LOCALHOST_PATTERNS = ['localhost', '127.0.0.1'];

function isLocalhostOrigin(hostname: string): boolean {
  return LOCALHOST_PATTERNS.some((p) => hostname === p || hostname.startsWith(`${p}:`));
}

/**
 * Match a hostname against a pattern supporting prefix wildcards.
 * Pattern "floorplan-*.vercel.app" matches "floorplan-abc123.vercel.app"
 * but NOT "evil-attacker.vercel.app".
 */
function matchesPattern(hostname: string, pattern: string): boolean {
  if (!pattern.includes('*')) {
    return hostname === pattern;
  }
  const starIdx = pattern.indexOf('*');
  const prefix = pattern.slice(0, starIdx);
  const suffix = pattern.slice(starIdx + 1);
  return (
    hostname.startsWith(prefix) &&
    hostname.endsWith(suffix) &&
    hostname.length >= prefix.length + suffix.length
  );
}

function parseAllowedOrigins(allowedOriginsEnv: string | undefined): string[] {
  if (!allowedOriginsEnv) return [];
  return allowedOriginsEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Resolve auth origin from a request.
 *
 * Extracts the origin from request headers (x-custom-forwarded-host, then
 * origin header, then host header) and validates it against the allowlist.
 * Returns SITE_URL as baseURL if the origin is missing, disallowed, or
 * ALLOWED_ORIGINS is unset.
 */
export function resolveAuthOrigin(
  request: Request,
  siteUrl: string,
  allowedOriginsEnv: string | undefined,
): AuthOriginResult {
  const allowedPatterns = parseAllowedOrigins(allowedOriginsEnv);

  const forwardedHost = request.headers.get('x-custom-forwarded-host');
  const originHeader = request.headers.get('origin');
  const hostHeader = request.headers.get('host');

  let requestHostname: string | null = null;
  let requestProtocol = 'https:';

  if (forwardedHost) {
    requestHostname = forwardedHost;
  } else if (originHeader) {
    try {
      const parsed = new URL(originHeader);
      requestHostname = parsed.hostname;
      requestProtocol = parsed.protocol;
    } catch {
      // malformed origin — fall through
    }
  } else if (hostHeader) {
    requestHostname = hostHeader.split(':')[0];
  }

  if (!requestHostname) {
    return {
      baseURL: siteUrl,
      trustedOrigins: [siteUrl],
      validOrigin: false,
    };
  }

  if (isLocalhostOrigin(requestHostname)) {
    const port = hostHeader?.includes(':') ? `:${hostHeader.split(':')[1]}` : '';
    const protocol = requestProtocol === 'http:' ? 'http:' : 'https:';
    const baseURL = `${protocol}//${requestHostname}${port}`;
    return {
      baseURL,
      trustedOrigins: [siteUrl, baseURL],
      validOrigin: true,
    };
  }

  if (allowedPatterns.length === 0) {
    return {
      baseURL: siteUrl,
      trustedOrigins: [siteUrl],
      validOrigin: false,
    };
  }

  const isAllowed = allowedPatterns.some((pattern) => matchesPattern(requestHostname, pattern));

  if (!isAllowed) {
    return {
      baseURL: siteUrl,
      trustedOrigins: [siteUrl],
      validOrigin: false,
    };
  }

  const baseURL = `${requestProtocol}//${requestHostname}`;
  return {
    baseURL,
    trustedOrigins: [siteUrl, baseURL],
    validOrigin: true,
  };
}
