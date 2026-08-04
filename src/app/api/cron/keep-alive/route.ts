import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// ─── Cron Job: Supabase Keep-Alive ────────────────────────
// Pings Supabase every 30 minutes to prevent free-tier pause.
// Configured via vercel.json cron.

export async function GET() {
  try {
    const supabase = createAdminClient();
    const start = Date.now();

    const { data, error } = await supabase
      .from("patients")
      .select("id", { count: "exact", head: true })
      .limit(1);

    const duration = Date.now() - start;

    if (error) {
      console.warn("[KeepAlive] Query warning:", error.message);
    }

    return NextResponse.json({
      status: "ok",
      supabase: true,
      latencyMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[KeepAlive] Failed:", error.message);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
