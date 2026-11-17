import { timingSafeEqual } from "crypto";

export function getAuthConfig() {
  const secret = (process.env.AUTH_SECRET || "").trim();
  return { secret };
}

export function toBase64UrlBytes(input: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "utf8").toString("base64url");
  }
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function fromBase64UrlBytes(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof Buffer !== "undefined") {
    return Buffer.from(normalized, "base64").toString("utf8");
  }
  return atob(normalized);
}

// Constant-time string comparison for HMAC signatures.
export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function sign(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  const bytes = new Uint8Array(signature);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return typeof Buffer !== "undefined"
    ? Buffer.from(bytes).toString("base64url")
    : btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function createTempMfaToken(userId: number) {
  const { secret } = getAuthConfig();
  if (!secret) throw new Error("AUTH_SECRET is required.");

  const payload = toBase64UrlBytes(JSON.stringify({
    userId,
    purpose: "mfa_pending",
    expiresAt: Date.now() + 300000, // 5 minutes
  }));
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifyTempMfaToken(token: string | undefined | null) {
  const { secret } = getAuthConfig();
  if (!token || !secret) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if (!constantTimeEqual(await sign(payload, secret), signature)) return null;

  try {
    const data = JSON.parse(fromBase64UrlBytes(payload)) as { userId?: number; purpose?: string; expiresAt?: number };
    if (data.purpose !== "mfa_pending" || !data.userId || !data.expiresAt) return null;
    if (Date.now() > data.expiresAt) return null; // Token expired
    return data.userId;
  } catch {
    return null;
  }
}
