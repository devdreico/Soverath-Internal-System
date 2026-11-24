import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function env(name: string) {
  return process.env[name]?.trim() || "";
}

export async function GET() {
  const supabaseUrl =
    env("NEXT_PUBLIC_SUPABASE_URL") || env("NEXT_PUBLIC_SOVERATH_SIS_SUPABASE_URL");
  const supabaseKey =
    env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    env("NEXT_PUBLIC_SOVERATH_SIS_SUPABASE_PUBLISHABLE_KEY");
  const founderId = env("SIS_FOUNDER_USER_ID") || env("NEXT_PUBLIC_FOUNDER_USER_ID");

  const requestedProvider = env("AI_PROVIDER").toLowerCase();
  const aiProvider =
    requestedProvider ||
    (env("OPENROUTER_API_KEY") ? "openrouter" : env("GOOGLE_AI_STUDIO_API_KEY") ? "google" : "");

  const checks = {
    supabase_url: Boolean(supabaseUrl),
    supabase_key: Boolean(supabaseKey),
    founder_id: Boolean(founderId),
    ai_provider: Boolean(aiProvider),
    ai_key:
      aiProvider === "openrouter"
        ? Boolean(env("OPENROUTER_API_KEY"))
        : aiProvider === "google"
          ? Boolean(env("GOOGLE_AI_STUDIO_API_KEY"))
          : false,
  };

  let supabaseReachable = false;
  let supabaseStatus = "not_configured";
  if (supabaseUrl && supabaseKey) {
    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/health`, {
        headers: { apikey: supabaseKey },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      supabaseReachable = response.ok;
      supabaseStatus = response.ok ? "ok" : `http_${response.status}`;
    } catch {
      supabaseStatus = "unreachable";
    }
  }

  const ok =
    checks.supabase_url &&
    checks.supabase_key &&
    checks.founder_id &&
    supabaseReachable;

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      checks,
      supabase: { reachable: supabaseReachable, status: supabaseStatus },
      ai: { provider: aiProvider || null },
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
