import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessScope } from "@/lib/data-helpers";
import { clearTestManagementCache } from "@/lib/test-management-data";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: rawId } = await params;
    const scope = getAccessScope(user);

    // Locate the test plan by numeric id or publicToken
    const isNum = /^\d+$/.test(rawId);
    const plan = await db.get<{ id: number; publicToken: string; title: string }>(
      `SELECT "id", "publicToken", "title" FROM "TestPlan" WHERE ${
        isNum ? '("id" = CAST(? AS INTEGER) OR "publicToken" = ?)' : '"publicToken" = ?'
      } AND "deletedAt" IS NULL${scope.andWhere}`,
      isNum ? [rawId, rawId, ...scope.params] : [rawId, ...scope.params],
    );

    if (!plan) {
      return NextResponse.json({ error: "Test plan not found." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const rawSuiteIds = Array.isArray(body?.suiteIds) ? body.suiteIds : [];
    const validSuiteIds = rawSuiteIds
      .map((sid: unknown) => Number(sid))
      .filter((num: number) => Number.isInteger(num) && num > 0);

    const planIdStr = String(plan.id);

    // 1. Unlink any suites currently linked to this plan in the user's scope
    await db.run(
      `UPDATE "TestSuite" SET "testPlanId" = '', "updatedAt" = CURRENT_TIMESTAMP WHERE "testPlanId" = ? AND "deletedAt" IS NULL${scope.andWhere}`,
      [planIdStr, ...scope.params],
    );

    // 2. Link selected suites to this plan
    if (validSuiteIds.length > 0) {
      const placeholders = validSuiteIds.map(() => "?").join(",");
      await db.run(
        `UPDATE "TestSuite" SET "testPlanId" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" IN (${placeholders}) AND "deletedAt" IS NULL${scope.andWhere}`,
        [planIdStr, ...validSuiteIds, ...scope.params],
      );
    }

    clearTestManagementCache();

    return NextResponse.json({
      success: true,
      planId: plan.id,
      linkedSuitesCount: validSuiteIds.length,
    });
  } catch (error) {
    console.error("POST /api/test-plans/[id]/suites error:", error);
    return NextResponse.json({ error: "Failed to update test plan suites." }, { status: 500 });
  }
}
