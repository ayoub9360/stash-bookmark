import { resolve } from "node:dns/promises";
import { isIP } from "node:net";

const PRIVATE_RANGES = [
  /^127\./, // loopback
  /^10\./, // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^192\.168\./, // 192.168.0.0/16
  /^169\.254\./, // link-local
  /^0\./, // 0.0.0.0/8
  /^::1$/, // IPv6 loopback
  /^fe80:/i, // IPv6 link-local
  /^fc00:/i, // IPv6 unique local
  /^fd/i, // IPv6 unique local
];

const BLOCKED_HOSTNAMES = ["localhost", "metadata.google.internal"];

function isPrivateAddr(addr: string): boolean {
  return PRIVATE_RANGES.some((re) => re.test(addr));
}

export function isPrivateIP(hostname: string): boolean {
  if (BLOCKED_HOSTNAMES.includes(hostname.toLowerCase())) {
    return true;
  }

  // If it's a raw IP, check directly
  if (isIP(hostname)) {
    return isPrivateAddr(hostname);
  }

  return false;
}

/**
 * Async DNS-based check. Use this for thorough validation
 * (hostname could resolve to a private IP).
 */
export async function resolvesToPrivateIP(hostname: string): Promise<boolean> {
  if (isPrivateIP(hostname)) return true;

  try {
    const addresses = await resolve(hostname);
    return addresses.some(isPrivateAddr);
  } catch {
    // DNS resolution failed — block to be safe
    return true;
  }
}
