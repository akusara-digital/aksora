import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const DATA_URI_RE = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;
  if (!/^\d+$/.test(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const row = await db.get<{ avatar: string | null }>(
    'SELECT "avatar" FROM "User" WHERE "id" = CAST(? AS INTEGER)',
    [Number(userId)],
  );
  const raw = row?.avatar?.trim() || "";
  if (!raw) {
    return new NextResponse(null, { status: 404 });
  }

  const match = raw.match(DATA_URI_RE);
  if (match) {
    const contentType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
    const buf = Buffer.from(match[2], "base64");
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  }

  if (/^https?:\/\//i.test(raw)) {
    return NextResponse.redirect(raw, {
      status: 302,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  }

  return new NextResponse(null, { status: 404 });
}
