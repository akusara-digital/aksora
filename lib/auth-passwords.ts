import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const PASSWORD_SCHEME = "scrypt";
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_SALT_BYTES = 16;

export function hashLegacyPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function isLegacyPasswordHash(value: string) {
  return /^[a-f0-9]{64}$/i.test(String(value ?? ""));
}

export async function hashPassword(password: string) {
  const salt = randomBytes(SCRYPT_SALT_BYTES).toString("hex");
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
  return `${PASSWORD_SCHEME}$${salt}$${derived}`;
}

export async function verifyPassword(password: string, storedHash: string | null | undefined) {
  const normalizedHash = String(storedHash ?? "").trim();
  if (!normalizedHash) return false;

  if (isLegacyPasswordHash(normalizedHash)) {
    return timingSafeEqual(
      Buffer.from(hashLegacyPassword(password), "utf8"),
      Buffer.from(normalizedHash, "utf8"),
    );
  }

  const [scheme, salt, derivedHash] = normalizedHash.split("$");
  if (scheme !== PASSWORD_SCHEME || !salt || !derivedHash) return false;

  const expected = Buffer.from(derivedHash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(actual, expected);
}
