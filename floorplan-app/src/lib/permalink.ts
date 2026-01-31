/**
 * Permalink utilities for floorplan snapshots.
 * 
 * Permalinks are immutable URLs that point to a specific snapshot (content-addressable).
 * Format: /u/{username}/{project}/s/{hash}
 */

/**
 * Generate a permalink URL for a snapshot
 * @param username - Project owner's username
 * @param projectSlug - Project slug
 * @param hash - Content hash of the snapshot (8 character hex)
 * @param absolute - Whether to return absolute URL (default: false)
 */
export function generatePermalink(
  username: string,
  projectSlug: string,
  hash: string,
  absolute = false
): string {
  const path = `/u/${username}/${projectSlug}/s/${hash}`;
  
  if (absolute && typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  
  return path;
}

/**
 * Generate a version URL (mutable)
 * @param username - Project owner's username
 * @param projectSlug - Project slug
 * @param versionName - Version name (e.g., "main")
 * @param absolute - Whether to return absolute URL (default: false)
 */
export function generateVersionUrl(
  username: string,
  projectSlug: string,
  versionName: string,
  absolute = false
): string {
  const path = `/u/${username}/${projectSlug}/v/${versionName}`;
  
  if (absolute && typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  
  return path;
}

/**
 * Copy text to clipboard with fallback for older browsers
 * @param text - Text to copy
 * @returns Promise that resolves when copy is complete
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      return success;
    }
  } catch {
    return false;
  }
}

/**
 * Shorten a hash for display (show first 6 characters)
 * @param hash - Full content hash
 */
export function shortenHash(hash: string): string {
  return hash.slice(0, 6);
}

/**
 * Parse a permalink URL to extract components
 * @param url - Permalink URL or path
 * @returns Parsed components or null if invalid
 */
export function parsePermalink(url: string): {
  username: string;
  projectSlug: string;
  hash: string;
} | null {
  // Handle both full URLs and paths
  const path = url.startsWith("http") ? new URL(url).pathname : url;
  
  // Match /u/{username}/{project}/s/{hash}
  const match = path.match(/^\/u\/([^/]+)\/([^/]+)\/s\/([a-f0-9]+)$/i);
  
  if (!match) return null;
  
  return {
    username: match[1],
    projectSlug: match[2],
    hash: match[3],
  };
}

/**
 * Check if a URL is a permalink (immutable) vs version URL (mutable)
 */
export function isPermalink(url: string): boolean {
  return parsePermalink(url) !== null;
}
