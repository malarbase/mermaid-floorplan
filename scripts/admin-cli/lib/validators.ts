export function isValidDomain(domain: string): boolean {
  const pattern =
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])$/;
  return pattern.test(domain) && domain.length <= 253;
}

export function isValidEmail(email: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

export function isValidUrl(url: string, protocols: string[] = ['https:']): boolean {
  try {
    const parsed = new URL(url);
    return protocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function isValidGoogleClientId(id: string): boolean {
  return id.endsWith('.apps.googleusercontent.com');
}

export function isValidConvexUrl(
  url: string,
  suffix: '.convex.cloud' | '.convex.site' = '.convex.cloud',
): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith(suffix);
  } catch {
    return false;
  }
}
