import { NextResponse } from "next/server";
import { DEFAULT_AI_MODELS, AI_PROVIDER_LABELS, fetchProviderModels } from "@/lib/ai-service";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers: Record<string, string[]> = {
    ...DEFAULT_AI_MODELS,
  };

  const status: Record<string, "connected" | "disconnected"> = {
    google: "disconnected",
    openai: "disconnected",
    anthropic: "disconnected",
    groq: "disconnected",
    deepseek: "disconnected",
    "9router-public": "disconnected",
  };

  return NextResponse.json(
    {
      data: {
        providers,
        labels: AI_PROVIDER_LABELS,
        status,
      },
    },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    }
  );
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      provider?: string;
      api_key?: string;
      public_url?: string;
    };

    const provider = (body.provider || "").trim().toLowerCase();
    if (!provider) {
      return NextResponse.json({ error: "Provider is required" }, { status: 400 });
    }

    const models = await fetchProviderModels(provider, body.api_key, body.public_url);
    return NextResponse.json({
      data: {
        provider,
        models,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch models" },
      { status: 500 }
    );
  }
}
