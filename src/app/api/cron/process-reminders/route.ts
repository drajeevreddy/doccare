import { NextResponse } from "next/server";
import { processScheduledReminders } from "@/lib/queries";

// ─── Cron Job: Process Scheduled Reminders ────────────────
// This endpoint should be called periodically (every 15-30 minutes)
// by a cron service like Vercel Cron Jobs, GitHub Actions, or uptimerobot.com
//
// Configuration:
//   Add to vercel.json: { "crons": [{ "path": "/api/cron/process-reminders", "schedule": "*/15 * * * *" }] }
//   Or use GitHub Actions with a scheduled workflow calling GET /api/cron/process-reminders

export async function GET() {
  console.log("[Cron] Processing scheduled reminders...");
  const startTime = Date.now();

  try {
    const result = await processScheduledReminders();
    const duration = Date.now() - startTime;

    console.log(`[Cron] Done: ${result.sent} sent, ${result.errors} errors, ${result.checked} checked in ${duration}ms`);

    return NextResponse.json({
      status: 200,
      message: "Scheduled reminders processed",
      ...result,
      durationMs: duration,
    });
  } catch (error: any) {
    console.error("[Cron] Error processing reminders:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process reminders" },
      { status: 500 }
    );
  }
}

// Also allow POST for flexibility
export async function POST() {
  return GET();
}

// Allow cron jobs on Serverless/Edge
export const runtime = "nodejs";
