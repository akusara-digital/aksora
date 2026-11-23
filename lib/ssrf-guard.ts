import { isIP } from "net";
import { lookup } from "dns/promises";

// Blocks outbound HTTP(S) requests to loopback, link-local, private (RFC 1918),
// and cloud-metadata addresses. Used anywhere a user-supplied URL (webhook,
// AI gateway probe, etc.) is fetched server-side, to prevent SSRF against the
// app's own internal network or cloud metadata endpoints.

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b, c] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local + cloud metadata)
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (Carrier-Grade NAT)
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // 192.0.0.0/24 & 192.0.2.0/24 (TEST-NET-1)
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24 (TEST-NET-2)
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24 (TEST-NET-3)
  if (a >= 224) return true; // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true; // loopback & unspecified
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7 unique local
  if (lower.startsWith("fe80:")) return true; // fe80::/10 link-local
  if (lower.startsWith("2001:db8:") || lower.startsWith("100::")) return true; // documentation & discard
  if (lower.startsWith("ff00:") || lower.startsWith("ff")) return true; // multicast
  if (lower === "::" || lower.startsWith("::ffff:")) {
    // IPv4-mapped IPv6 — check both dot-decimal and hex notation
    const mapped = lower.replace("::ffff:", "");
    if (isIP(mapped) === 4) return isPrivateIPv4(mapped);
    const parts = mapped.split(":");
    if (parts.length === 2) {
      const h = parseInt(parts[0], 16);
      const l = parseInt(parts[1], 16);
      if (!Number.isNaN(h) && !Number.isNaN(l)) {
        return isPrivateIPv4(`${(h >> 8) & 0xff}.${h & 0xff}.${(l >> 8) & 0xff}.${l & 0xff}`);
      }
    }
  }
  return false;
}

function checkHostnameSyntax(rawUrl: string): { error: string | null; hostname?: string } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { error: "Invalid URL." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: "Only http:// and https:// URLs are allowed." };
  }

  // URL.hostname wraps IPv6 literals in brackets ("[::1]"); net.isIP() needs
  // the bare address, so strip them before classifying.
  const rawHostname = url.hostname.toLowerCase();
  const hostname = rawHostname.startsWith("[") && rawHostname.endsWith("]")
    ? rawHostname.slice(1, -1)
    : rawHostname;

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { error: "This host is not allowed." };
  }

  const ipVersion = isIP(hostname);
  if (ipVersion === 4 && isPrivateIPv4(hostname)) {
    return { error: "Private and loopback IP addresses are not allowed." };
  }
  if (ipVersion === 6 && isPrivateIPv6(hostname)) {
    return { error: "Private and loopback IP addresses are not allowed." };
  }

  return { error: null, hostname };
}

/**
 * Synchronous syntax-only check: protocol, blocked hostnames, and literal IP
 * addresses in the URL. Does NOT resolve DNS, so a public hostname that
 * currently resolves to a private IP (DNS rebinding) is not caught here —
 * use validateOutboundUrlAsync at actual fetch time for that protection.
 * Safe to use for immediate form/API input validation.
 */
export function validateOutboundUrl(rawUrl: string): string | null {
  return checkHostnameSyntax(rawUrl).error;
}

/**
 * Full check including a DNS resolution of the hostname, to catch a public
 * domain that resolves to a private/loopback IP (DNS rebinding). Use this
 * immediately before making the actual outbound fetch, not just at
 * save-time, since DNS answers can change between creation and delivery.
 */
export async function validateOutboundUrlAsync(rawUrl: string): Promise<string | null> {
  const { error, hostname } = checkHostnameSyntax(rawUrl);
  if (error) return error;
  if (!hostname || isIP(hostname)) return null; // literal IP already checked above

  try {
    const dnsTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DNS resolution timeout")), 3000)
    );
    const resolved = await Promise.race([
      lookup(hostname, { all: true } as unknown as { all: true }),
      dnsTimeout,
    ]);
    const records = Array.isArray(resolved) ? resolved : [resolved];
    for (const record of records) {
      if (!record) continue;
      const family = typeof record.family === "number" ? record.family : isIP(record.address);
      if (family === 4 && isPrivateIPv4(record.address)) {
        return "This host resolves to a private or loopback IP address.";
      }
      if (family === 6 && isPrivateIPv6(record.address)) {
        return "This host resolves to a private or loopback IP address.";
      }
    }
  } catch {
    return "Could not resolve host.";
  }

  return null;
}
