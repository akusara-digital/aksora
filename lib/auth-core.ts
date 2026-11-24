import { timingSafeEqual } from "crypto";
import { cache } from "react";
import { syncAssigneeFromUser } from "@/lib/user-assignee-sync";
import {
  hashPassword,
  verifyPassword,
  isLegacyPasswordHash,
} from "@/lib/auth-passwords";
export { hashPassword, verifyPassword, isLegacyPasswordHash };
import {
  WORKSPACE_ROLES,
  INVITE_ROLES,
  normalizeRole,
  isPlatformSuperAdmin,
  isInviteRole,
  getRoleLabel,
  getInviteRoleOptions,
  getPublicRoleOptions,
} from "@/lib/roles";
import { apiUserContext } from "@/lib/auth-context";

const PRIMARY_COOKIE_NAME = "aksora_token";
const FALLBACK_COOKIE_NAME = "aksora_session";
const COOKIE_NAME = PRIMARY_COOKIE_NAME;

export { WORKSPACE_ROLES, INVITE_ROLES, normalizeRole, isPlatformSuperAdmin, isInviteRole, getRoleLabel, getInviteRoleOptions, getPublicRoleOptions };

import {
  getAuthConfig,
  toBase64UrlBytes,
  fromBase64UrlBytes,
  constantTimeEqual,
  sign,
  createTempMfaToken,
  verifyTempMfaToken,
} from "@/lib/auth-tokens";
export { createTempMfaToken, verifyTempMfaToken };

export function authEnabled() {
  const { secret } = getAuthConfig();
  return Boolean(secret);
}

// Shared constant-time check for cron/webhook/admin-tool routes gated by a
// single shared-secret env var compared against an incoming header or body
// field (CRON_SECRET, RESET_SECRET, etc.) — a plain `!==` here leaks timing
// information that lets an attacker recover the secret byte-by-byte.
export function verifySharedSecret(provided: unknown, expected: string | null | undefined): boolean {
  const expectedTrimmed = (expected ?? "").trim();
  if (!expectedTrimmed || typeof provided !== "string" || !provided) return false;
  return constantTimeEqual(provided, expectedTrimmed);
}

export async function validateCredentials(email: string, password: string) {
  try {
    const { db } = await import("./db");
    const { randomUUID } = await import("crypto");
    const user = await db.get<{
      id: number;
      uuid?: string;
      name: string;
      email: string;
      role: string;
      company: string;
      password: string;
      mfaEnabled: number;
      mfaSecret: string | null;
      emailVerified: number;
      activeWorkspaceId: number | null;
      locale?: string;
    }>(
      `SELECT u."id", u."uuid", u."name", u."email", COALESCE(wm."role", u."role") AS "role", u."company", u."password", u."mfaEnabled", u."mfaSecret", u."emailVerified", COALESCE(u."activeWorkspaceId", w."id") AS "activeWorkspaceId", u."locale"
       FROM "User" u
       LEFT JOIN "Workspace" w ON w."name" = u."company"
       LEFT JOIN "WorkspaceMembership" wm ON wm."workspaceId" = COALESCE(u."activeWorkspaceId", w."id") AND wm."userId" = u."id"
       WHERE u."email" = ?`,
      [email]
    );
    if (!user) return null;

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) return null;

    if (isLegacyPasswordHash(user.password)) {
      const upgradedHash = await hashPassword(password);
      await db.run(
        'UPDATE "User" SET "password" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = CAST(? AS INTEGER)',
        [upgradedHash, user.id],
      );
    }

    // Ensure user has uuid
    let userUuid = user.uuid;
    if (!userUuid) {
      userUuid = randomUUID();
      try {
        await db.run('UPDATE "User" SET "uuid" = ? WHERE "id" = CAST(? AS INTEGER)', [userUuid, user.id]);
        user.uuid = userUuid;
      } catch { /* ignore non-critical */ }
    }

    // Ensure dedicated workspace for user so users don't share workspace 1 / Wahyu's data
    let workspaceUuid = "";
    try {
      const { ensurePersonalWorkspaceForUser } = await import("./workspace-memberships");
      const ws = await ensurePersonalWorkspaceForUser(user.id, user.name, user.email, user.company);
      if (ws) {
        user.activeWorkspaceId = ws.id;
        user.company = ws.name;
        workspaceUuid = ws.uuid || "";
      }
    } catch { /* non-critical */ }

    if (!workspaceUuid && user.activeWorkspaceId) {
      try {
        const wsRow = await db.get<{ uuid?: string }>('SELECT "uuid" FROM "Workspace" WHERE "id" = CAST(? AS INTEGER)', [user.activeWorkspaceId]);
        if (wsRow?.uuid) {
          workspaceUuid = wsRow.uuid;
        } else {
          workspaceUuid = randomUUID();
          await db.run('UPDATE "Workspace" SET "uuid" = ? WHERE "id" = CAST(? AS INTEGER)', [workspaceUuid, user.activeWorkspaceId]);
        }
      } catch { /* non-critical */ }
    }

    return {
      id: user.id,
      uuid: user.uuid || userUuid,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      activeWorkspaceId: user.activeWorkspaceId ?? null,
      workspaceUuid,
      mfaEnabled: Boolean(user.mfaEnabled),
      mfaSecret: user.mfaSecret || null,
      emailVerified: Boolean(user.emailVerified),
      locale: user.locale || "en",
    };
  } catch (err) {
    console.error("Auth DB error:", err);
    return null;
  }
}

export type RegisterUserResult =
  | { success: true; uuid: string; workspaceUuid?: string; error?: never }
  | { error: string; success?: never; uuid?: never; workspaceUuid?: never };

export async function registerUser(email: string, password: string, name?: string, role: string = "qa", company: string = ""): Promise<RegisterUserResult> {
  try {
    const { db } = await import("./db");
    const { randomUUID } = await import("crypto");
    const userUuid = randomUUID();
    const hashedPassword = password ? await hashPassword(password) : "";
    try {
      await db.run(
        'INSERT INTO "User" ("uuid", "email", "password", "name", "role", "company") VALUES (?, ?, ?, ?, ?, ?)',
        [userUuid, email, hashedPassword, name || email, role, company],
      );
    } catch (insertErr: unknown) {
      const errObj = insertErr as { code?: unknown; message?: unknown } | null;
      if (errObj?.code === "23505" || String(errObj?.message ?? "").includes("UNIQUE constraint")) {
        throw insertErr;
      }
      // If column uuid does not exist yet (in older test mocks), fallback to 5-param insert
      await db.run(
        'INSERT INTO "User" ("email", "password", "name", "role", "company") VALUES (?, ?, ?, ?, ?)',
        [email, hashedPassword, name || email, role, company],
      );
    }

    const user = await db.get<{ id: number; uuid?: string; company: string; name: string | null; email: string | null; role: string | null; workspaceId?: number | null; activeWorkspaceId?: number | null }>(
      'SELECT "id", "uuid", "company", "name", "email", "role", "workspaceId", "activeWorkspaceId" FROM "User" WHERE "email" = ?',
      [email],
    );
    let workspaceUuid = "";
    if (user) {
      if (!user.uuid) {
        try {
          await db.run('UPDATE "User" SET "uuid" = ? WHERE "id" = CAST(? AS INTEGER)', [userUuid, user.id]);
          user.uuid = userUuid;
        } catch { /* ignore non-critical */ }
      }
      try {
        const { ensurePersonalWorkspaceForUser } = await import("./workspace-memberships");
        const ws = await ensurePersonalWorkspaceForUser(user.id, user.name, user.email, company || user.company);
        if (ws) {
          user.company = ws.name;
          workspaceUuid = ws.uuid || "";
        }
      } catch { /* non-critical */ }

      if (!workspaceUuid && (user.activeWorkspaceId || user.workspaceId)) {
        const wsId = user.activeWorkspaceId || user.workspaceId;
        try {
          const wsRow = await db.get<{ uuid?: string }>('SELECT "uuid" FROM "Workspace" WHERE "id" = CAST(? AS INTEGER)', [wsId]);
          if (wsRow?.uuid) {
            workspaceUuid = wsRow.uuid;
          } else {
            workspaceUuid = randomUUID();
            await db.run('UPDATE "Workspace" SET "uuid" = ? WHERE "id" = CAST(? AS INTEGER)', [workspaceUuid, wsId]);
          }
        } catch { /* non-critical */ }
      }

      await syncAssigneeFromUser(user);
    }
    return {
      success: true,
      uuid: user?.uuid || userUuid,
      ...(workspaceUuid ? { workspaceUuid } : {}),
    };
  } catch (err: unknown) {
    const error = err as { code?: unknown; message?: unknown } | null;
    if (error?.code === "23505" || String(error?.message ?? "").includes("UNIQUE constraint")) {
      return { error: "Email address is already registered. Please use a different email." };
    }
    return { error: "Registration failed. Please try again later." };
  }
}

export async function createSessionToken(
  email: string,
  user?: { id: number; uuid?: string; name: string; role: string; company: string; activeWorkspaceId?: number | null; workspaceUuid?: string; locale?: string },
  ttlMs?: number,
) {
  const { secret } = getAuthConfig();
  if (!secret) {
    throw new Error("AUTH_SECRET is required.");
  }
  // Include password hash prefix as version marker for revocation
  let pv = "";
  if (user) {
    try {
      const { db } = await import("./db");
      const row = await db.get<{ password: string }>(
        'SELECT "password" FROM "User" WHERE "id" = CAST(? AS INTEGER)',
        [user.id],
      );
      if (row?.password) {
        pv = row.password.slice(0, 16);
      }
    } catch { /* non-critical */ }
  }
  let userUuid = user?.uuid;
  let workspaceUuid = user?.workspaceUuid;

  if (user && (!userUuid || !workspaceUuid)) {
    try {
      const { db } = await import("./db");
      const row = await db.get<{ uuid?: string; workspaceId?: number | null; activeWorkspaceId?: number | null }>(
        'SELECT "uuid", "workspaceId", "activeWorkspaceId" FROM "User" WHERE "id" = CAST(? AS INTEGER)',
        [user.id],
      );
      if (row) {
        if (!userUuid && row.uuid) {
          userUuid = row.uuid;
        } else if (!userUuid) {
          const { randomUUID } = await import("crypto");
          userUuid = randomUUID();
          await db.run('UPDATE "User" SET "uuid" = ? WHERE "id" = CAST(? AS INTEGER)', [userUuid, user.id]);
        }

        if (!workspaceUuid) {
          const wsId = user.activeWorkspaceId ?? row.activeWorkspaceId ?? row.workspaceId;
          if (wsId) {
            const wsRow = await db.get<{ uuid?: string }>('SELECT "uuid" FROM "Workspace" WHERE "id" = CAST(? AS INTEGER)', [wsId]);
            if (wsRow?.uuid) {
              workspaceUuid = wsRow.uuid;
            } else {
              const { randomUUID } = await import("crypto");
              workspaceUuid = randomUUID();
              await db.run('UPDATE "Workspace" SET "uuid" = ? WHERE "id" = CAST(? AS INTEGER)', [workspaceUuid, wsId]);
            }
          }
        }
      }
    } catch { /* non-critical */ }
  }

  const payload = toBase64UrlBytes(JSON.stringify({
    email,
    ts: Date.now(),
    ...(ttlMs ? { ttl: ttlMs } : {}),
    ...(pv ? { pv } : {}),
    ...(user ? {
      id: user.id,
      uuid: userUuid || user.uuid,
      name: user.name,
      role: user.role,
      company: user.company,
      activeWorkspaceId: user.activeWorkspaceId ?? null,
      workspaceUuid: workspaceUuid || user.workspaceUuid,
      locale: user.locale || "en",
    } : {}),
  }));
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

const SESSION_DURATION = Number(process.env.SESSION_TTL_HOURS || 6) * 60 * 60 * 1000;

export async function verifySessionToken(token: string | undefined | null) {
  const { secret } = getAuthConfig();
  if (!token || !secret) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!constantTimeEqual(await sign(payload, secret), signature)) return false;
  try {
    const decoded = JSON.parse(fromBase64UrlBytes(payload)) as { email?: string; ts?: number; ttl?: number };
    const maxAge = decoded.ttl || SESSION_DURATION;
    if (decoded.ts && Date.now() - decoded.ts > maxAge) return false;
    return Boolean(decoded.email);
  } catch {
    return false;
  }
}

type CachedUserRow = { id: number; uuid?: string; password: string; company?: string; role?: string; workspaceId?: number | null; activeWorkspaceId?: number | null };
const userDbRowCache = new Map<number, { row: CachedUserRow; exp: number }>();

async function getCurrentUserUncached() {
  const apiUser = apiUserContext.getStore();
  if (apiUser) {
    return {
      ...apiUser,
      role: normalizeRole(apiUser.role),
      activeWorkspaceId: apiUser.workspaceId ?? null,
      workspaceUuid: (apiUser as { workspaceUuid?: string }).workspaceUuid || "",
    };
  }

  let token = "";
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    token =
      cookieStore.get(PRIMARY_COOKIE_NAME)?.value ||
      cookieStore.get(FALLBACK_COOKIE_NAME)?.value ||
      "";
  } catch {
    return null;
  }
  if (!token) return null;

  const { secret } = getAuthConfig();
  if (!secret) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  // Verify HMAC before trusting payload
  if (!constantTimeEqual(await sign(payload, secret), signature)) return null;

  try {
    const decoded = JSON.parse(fromBase64UrlBytes(payload)) as {
      email?: string; ts?: number; pv?: string;
      id?: number; uuid?: string; name?: string; role?: string; company?: string; activeWorkspaceId?: number | null; workspaceUuid?: string; locale?: string;
    };
    if (!decoded.email) return null;
    if (decoded.ts && Date.now() - decoded.ts > SESSION_DURATION) return null;

    // Fast path: user data embedded in token (new tokens after login)
    if (decoded.id && decoded.name !== undefined && decoded.role !== undefined && decoded.company !== undefined) {
      let validUserId = decoded.id;
      let userDbRow: { id: number; uuid?: string; password: string; company?: string; role?: string; workspaceId?: number | null; activeWorkspaceId?: number | null } | undefined;
      // Verify session hasn't been revoked and user exists in current DB (with fast 15s in-memory TTL)
      try {
        const { db } = await import("./db");
        const cached = userDbRowCache.get(decoded.id);
        if (cached && Date.now() < cached.exp) {
          userDbRow = cached.row;
        } else {
          userDbRow = await db.get<CachedUserRow>(
            'SELECT "id", "uuid", "password", "company", "role", "workspaceId", "activeWorkspaceId" FROM "User" WHERE "id" = CAST(? AS INTEGER)',
            [decoded.id],
          );
          if (userDbRow) {
            userDbRowCache.set(decoded.id, { row: userDbRow, exp: Date.now() + 15_000 });
          }
        }

        if (userDbRow) {
          if (decoded.pv && userDbRow.password && userDbRow.password.slice(0, 16) !== decoded.pv) {
            userDbRowCache.delete(decoded.id);
            return null; // Password changed - session revoked
          }
        } else if (decoded.email) {
          // User id not found in DB (e.g. after DB reset/reseed) - look up by email
          const byEmail = await db.get<{ id: number; uuid?: string; password: string }>(
            'SELECT "id", "uuid", "password" FROM "User" WHERE "email" = ?',
            [decoded.email],
          );
          if (byEmail?.id) {
            validUserId = byEmail.id;
          } else {
            // User exists in cryptographically verified token but missing in DB.
            // Re-create user record so foreign key constraints on userId never fail.
            try {
              const { randomUUID } = await import("crypto");
              const genUuid = decoded.uuid || randomUUID();
              const inserted = await db.get<{ id: number }>(
                `INSERT INTO "User" ("uuid", "name", "email", "password", "role", "company")
                 VALUES (?, ?, ?, 'session-restored', ?, ?)
                 ON CONFLICT ("email") DO UPDATE SET "name" = EXCLUDED."name"
                 RETURNING "id"`,
                [genUuid, decoded.name || decoded.email, decoded.email, decoded.role || "admin", decoded.company || ""]
              );
              if (inserted?.id) {
                validUserId = inserted.id;
              }
            } catch {
              /* ignore non-critical insert error */
            }
          }
        }
      } catch {
        /* non-critical fallback */
      }

      let userUuid = userDbRow?.uuid || decoded.uuid || "";
      if (!userUuid && validUserId) {
        try {
          const { randomUUID } = await import("crypto");
          userUuid = randomUUID();
          const { db } = await import("./db");
          await db.run('UPDATE "User" SET "uuid" = ? WHERE "id" = CAST(? AS INTEGER)', [userUuid, validUserId]);
        } catch { /* non-critical */ }
      }

      // Resolve company and activeWorkspaceId from DB if missing or outdated in token
      let effectiveCompany = userDbRow?.company || decoded.company || "";
      let activeWorkspaceId = decoded.activeWorkspaceId ?? userDbRow?.activeWorkspaceId ?? userDbRow?.workspaceId ?? null;
      if (activeWorkspaceId === null && effectiveCompany && effectiveCompany !== "Akusara Project") {
        try {
          const { db } = await import("./db");
          const ws = await db.get<{ id: number }>(
            'SELECT "id" FROM "Workspace" WHERE "name" = ? LIMIT 1',
            [effectiveCompany],
          );
          activeWorkspaceId = ws?.id ?? null;
        } catch { /* non-critical, stay null */ }
      }
      if (activeWorkspaceId === null) {
        try {
          const { db } = await import("./db");
          const mem = await db.get<{ workspaceId: number; name: string }>(
            `SELECT wm."workspaceId", w."name"
             FROM "WorkspaceMembership" wm
             INNER JOIN "Workspace" w ON w."id" = wm."workspaceId"
             WHERE wm."userId" = CAST(? AS INTEGER)
             ORDER BY (CASE WHEN w."id" = 1 THEN 1 ELSE 0 END) ASC, wm."id" ASC LIMIT 1`,
            [validUserId],
          );
          if (mem?.workspaceId) {
            activeWorkspaceId = mem.workspaceId;
            effectiveCompany = mem.name;
          }
        } catch { /* non-critical */ }
      }
      const { ensurePersonalWorkspaceForUser } = await import("./workspace-memberships");

      if (!activeWorkspaceId) {
        try {
          const personalWs = await ensurePersonalWorkspaceForUser(validUserId, decoded.name, decoded.email, effectiveCompany);
          if (personalWs) {
            activeWorkspaceId = personalWs.id;
            effectiveCompany = personalWs.name;
          }
        } catch { /* non-critical */ }
      }

      let workspaceUuid = decoded.workspaceUuid || "";
      if (activeWorkspaceId && !workspaceUuid) {
        try {
          const { db } = await import("./db");
          const wsRow = await db.get<{ uuid?: string }>('SELECT "uuid" FROM "Workspace" WHERE "id" = CAST(? AS INTEGER)', [activeWorkspaceId]);
          if (wsRow?.uuid) {
            workspaceUuid = wsRow.uuid;
          } else {
            const { randomUUID } = await import("crypto");
            workspaceUuid = randomUUID();
            await db.run('UPDATE "Workspace" SET "uuid" = ? WHERE "id" = CAST(? AS INTEGER)', [workspaceUuid, activeWorkspaceId]);
          }
        } catch { /* non-critical */ }
      }

      return {
        id: validUserId,
        uuid: userUuid,
        name: decoded.name,
        email: decoded.email,
        role: normalizeRole(userDbRow?.role || decoded.role),
        company: effectiveCompany,
        activeWorkspaceId,
        workspaceId: activeWorkspaceId,
        workspaceUuid,
        locale: decoded.locale || "en",
      };
    }

    // Fallback: old tokens without embedded user data - hit DB once
    const { db } = await import("./db");
    const user = await db.get<{ id: number; uuid?: string; name: string; email: string; role: string; company: string; activeWorkspaceId: number | null; workspaceUuid?: string; locale?: string }>(
      `SELECT u.id, u.uuid, u.name, u.email, COALESCE(wm.role, u.role) AS "role", u.company, COALESCE(u."activeWorkspaceId", w.id) AS "activeWorkspaceId", w.uuid AS "workspaceUuid", u.locale
       FROM "User" u
       LEFT JOIN "Workspace" w ON w.name = u.company
       LEFT JOIN "WorkspaceMembership" wm ON wm."workspaceId" = COALESCE(u."activeWorkspaceId", w."id") AND wm."userId" = u."id"
       WHERE u.email = ?`,
      [decoded.email]
    );
    if (!user) return null;
    let fallbackActiveWs = user.activeWorkspaceId;
    let fallbackCompany = user.company;
    let fallbackWsUuid = user.workspaceUuid || "";
    const { ensurePersonalWorkspaceForUser } = await import("./workspace-memberships");

    if (!fallbackActiveWs) {
      try {
        const ws = await ensurePersonalWorkspaceForUser(user.id, user.name, user.email, user.company);
        if (ws) {
          fallbackActiveWs = ws.id;
          fallbackCompany = ws.name;
          fallbackWsUuid = ws.uuid || fallbackWsUuid;
        }
      } catch {}
    }

    if (!fallbackWsUuid && fallbackActiveWs) {
      try {
        const wsRow = await db.get<{ uuid?: string }>('SELECT "uuid" FROM "Workspace" WHERE "id" = CAST(? AS INTEGER)', [fallbackActiveWs]);
        fallbackWsUuid = wsRow?.uuid || "";
      } catch {}
    }

    return {
      ...user,
      uuid: user.uuid || "",
      role: normalizeRole(user.role),
      company: fallbackCompany || "Personal Workspace",
      activeWorkspaceId: fallbackActiveWs ?? null,
      workspaceId: fallbackActiveWs ?? null,
      workspaceUuid: fallbackWsUuid,
      locale: user.locale || "en",
    };
  } catch {
    return null;
  }
}

export const getCurrentUser = cache(getCurrentUserUncached);

export function sessionCookieName() {
  return COOKIE_NAME;
}
