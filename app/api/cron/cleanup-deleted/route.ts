import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifySharedSecret, getCurrentUser } from "@/lib/auth";
import { isManagementAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CLEANUP_TABLES = [
  "Task",
  "Bug",
  "TestCase",
  "TestPlan",
  "TestSession",
  "TestSuite",
  "Deployment",
  "MeetingNote",
  "WorkLog",
] as const;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const isSecretMatch = verifySharedSecret(auth, secret ? `Bearer ${secret}` : null);

  // Also allow authenticated management admins to trigger maintenance on-demand
  const user = !isSecretMatch ? await getCurrentUser().catch(() => null) : null;
  const isAdmin = !!user && isManagementAdmin(user.role, user.company);

  if (!isSecretMatch && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deletedCounts: Record<string, number> = {};

  try {
    // 1. Purge soft-deleted items older than 30 days (free-tier storage optimization)
    for (const table of CLEANUP_TABLES) {
      const rows = await db.query<{ id: number | string }>(
        `DELETE FROM "${table}" WHERE "deletedAt" IS NOT NULL AND "deletedAt" < CURRENT_TIMESTAMP - INTERVAL '30 days' RETURNING "id"`
      );
      deletedCounts[table] = rows.length;
    }

    // 2. Ephemeral presence records older than 1 day
    const staleHeartbeats = await db.query<{ id: number }>(
      `DELETE FROM "PresenceHeartbeat" WHERE "lastSeen" < CURRENT_TIMESTAMP - INTERVAL '1 day' RETURNING "id"`
    );
    deletedCounts["PresenceHeartbeat"] = staleHeartbeats.length;

    const stalePresence = await db.query<{ id: number }>(
      `DELETE FROM "CollaborationPresence" WHERE "updatedAt" < CURRENT_TIMESTAMP - INTERVAL '1 day' RETURNING "id"`
    );
    deletedCounts["CollaborationPresence"] = stalePresence.length;

    // 3. Activity logs older than 60 days
    const staleActivity = await db.query<{ id: number }>(
      `DELETE FROM "ActivityLog" WHERE "createdAt" < CURRENT_TIMESTAMP - INTERVAL '60 days' RETURNING "id"`
    );
    deletedCounts["ActivityLog"] = staleActivity.length;

    // 4. Orphan search tokens
    await db.run(
      `DELETE FROM "SearchToken" WHERE 
        ("entityType" = 'activity' AND NOT EXISTS (SELECT 1 FROM "ActivityLog" WHERE "ActivityLog"."id" = "SearchToken"."entityIdInt"))
        OR ("entityType" = 'task' AND NOT EXISTS (SELECT 1 FROM "Task" WHERE "Task"."id" = "SearchToken"."entityIdInt"))
        OR ("entityType" = 'bug' AND NOT EXISTS (SELECT 1 FROM "Bug" WHERE "Bug"."id" = "SearchToken"."entityIdInt"))
        OR ("entityType" = 'test-case' AND NOT EXISTS (SELECT 1 FROM "TestCase" WHERE "TestCase"."id" = "SearchToken"."entityIdInt"))`
    );

    // 5. Email events older than 30 days
    const staleEmailEvents = await db.query<{ id: number }>(
      `DELETE FROM "EmailEvent" WHERE "createdAt" < CURRENT_TIMESTAMP - INTERVAL '30 days' RETURNING "id"`
    );
    deletedCounts["EmailEvent"] = staleEmailEvents.length;

    // 6. Webhook event logs older than 14 days
    const staleWebhookEvents = await db.query<{ id: number }>(
      `DELETE FROM "WebhookEventLog" WHERE "processedAt" < CURRENT_TIMESTAMP - INTERVAL '14 days' RETURNING "id"`
    );
    deletedCounts["WebhookEventLog"] = staleWebhookEvents.length;

    // 7. A/B test events older than 30 days
    const staleAbEvents = await db.query<{ id: number }>(
      `DELETE FROM "AbTestEvent" WHERE "createdAt" < CURRENT_TIMESTAMP - INTERVAL '30 days' RETURNING "id"`
    );
    deletedCounts["AbTestEvent"] = staleAbEvents.length;

    // 8. Expired or used password reset tokens
    const staleResetTokens = await db.query<{ id: number }>(
      `DELETE FROM "PasswordResetToken" WHERE "expiresAt" < CURRENT_TIMESTAMP OR "usedAt" IS NOT NULL RETURNING "id"`
    );
    deletedCounts["PasswordResetToken"] = staleResetTokens.length;

    // 9. Admin notifications (read > 30d, unread > 90d)
    const staleNotifications = await db.query<{ id: number }>(
      `DELETE FROM "AdminNotification" WHERE 
        ("read" = 1 AND "createdAt" < CURRENT_TIMESTAMP - INTERVAL '30 days')
        OR ("read" = 0 AND "createdAt" < CURRENT_TIMESTAMP - INTERVAL '90 days')
      RETURNING "id"`
    );
    deletedCounts["AdminNotification"] = staleNotifications.length;

    // 10. AI usage logs older than 60 days
    const staleAiUsage = await db.query<{ id: number }>(
      `DELETE FROM "AiUsageLog" WHERE "createdAt" < CURRENT_TIMESTAMP - INTERVAL '60 days' RETURNING "id"`
    );
    deletedCounts["AiUsageLog"] = staleAiUsage.length;

    // 11. Admin audit logs older than 90 days
    const staleAudit = await db.query<{ id: number }>(
      `DELETE FROM "AdminAuditLog" WHERE "createdAt" < CURRENT_TIMESTAMP - INTERVAL '90 days' RETURNING "id"`
    );
    deletedCounts["AdminAuditLog"] = staleAudit.length;

    // 12. Stale execution case verdict attempts older than 60 days
    const staleAttempts = await db.query<{ id: number }>(
      `DELETE FROM "CaseVerdictAttempt" WHERE "createdAt" < CURRENT_TIMESTAMP - INTERVAL '60 days' RETURNING "id"`
    );
    deletedCounts["CaseVerdictAttempt"] = staleAttempts.length;

    // 13. Auto-compact (VACUUM) on high-churn tables to reclaim dead disk storage
    try {
      await db.run('VACUUM "PresenceHeartbeat"');
      await db.run('VACUUM "CollaborationPresence"');
      await db.run('VACUUM "ActivityLog"');
      await db.run('VACUUM "EmailEvent"');
      await db.run('VACUUM "SearchToken"');
      deletedCounts["vacuumStatus"] = 1;
    } catch {
      // Graceful fallback if transaction pooler restricts manual vacuum
      deletedCounts["vacuumStatus"] = 0;
    }

    // 14. Query final storage size
    let storageFormatted = "unknown";
    try {
      const sizeRow = await db.get<{ formatted: string }>(
        `SELECT pg_size_pretty(pg_database_size(current_database())) as formatted`
      );
      if (sizeRow?.formatted) storageFormatted = sizeRow.formatted;
    } catch {}

    return NextResponse.json({
      ok: true,
      cleanedAt: new Date().toISOString(),
      currentDbSize: storageFormatted,
      deletedCounts,
    });
  } catch (err) {
    console.error("Cleanup deleted cron error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
        deletedCounts,
      },
      { status: 500 }
    );
  }
}
