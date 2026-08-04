import { NextRequest, NextResponse } from "next/server";
import { generateICSFile } from "@/lib/calendar";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Appointment ID required" }, { status: 400 });
    }

    const db = createAdminClient();
    const { data: apt, error } = await db
      .from("appointments")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !apt) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const patientName = apt.patient_name || "Patient";
    const doctorName = apt.doctor_name || "Doctor";

    const event = {
      id: apt.id,
      title: `Appointment with ${doctorName} - ${patientName}`,
      description: `Appointment type: ${apt.type || "Consultation"}\\nDoctor: ${doctorName}\\nPatient: ${patientName}`,
      date: apt.appointment_date,
      time: apt.appointment_time || "09:00",
      durationMinutes: 30,
      location: "DocCare Clinic",
      doctorName,
      patientName,
    };

    const icsContent = generateICSFile(event);

    return new NextResponse(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="appointment-${apt.id.slice(0, 8)}.ics"`,
      },
    });
  } catch (error: any) {
    console.error("ICS generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate calendar file" },
      { status: 500 }
    );
  }
}
