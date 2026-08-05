import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      patientName,
      appointmentDate,
      appointmentTime,
      doctorName,
      channel,
    } = body;

    if (!patientName) {
      return NextResponse.json(
        { error: "patientName is required" },
        { status: 400 }
      );
    }

    // Log the reminder action
    const db = createAdminClient();
    await db.from("activity_logs").insert([{
      action: `Reminder sent to ${patientName} for ${appointmentDate || "—"} at ${appointmentTime?.slice(0,5) || "—"} with ${doctorName || "—"} via ${channel || "both"}`,
      resource_type: "reminder",
      created_at: new Date().toISOString(),
    }]);

    return NextResponse.json({
      success: true,
      smsSent: false,
      emailSent: false,
      message: `Reminder logged for ${patientName}`,
    });
  } catch (error: any) {
    console.error("Send reminder error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send reminder" },
      { status: 500 }
    );
  }
}
