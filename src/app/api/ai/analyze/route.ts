import { NextResponse } from "next/server";
import { getClinicSettings } from "@/lib/queries";

// NVIDIA NIM API — Llama 3.1 70B endpoint
const NVIDIA_NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL_NAME = "meta/llama-3.1-70b-instruct";

const MEDICAL_GROUNDING = `You are a clinical decision-support assistant for an endocrinology clinic. Your ONLY job is to compare a patient's latest report against their previous report and highlight what changed.

STRICT RULES:
1. Only analyze the report data provided in this prompt. Do not infer, guess, or fabricate values.
2. Ground all clinical interpretation in authoritative, trusted sources: ADA Standards of Care in Diabetes, WHO guidelines, KDIGO for kidney function, ACC/AHA for cardiovascular risk, and standard laboratory reference ranges.
3. If a value is missing or not provided, state "not available" — never invent data.
4. You are NOT a general medical assistant. Do not diagnose new conditions beyond what the data supports.
5. For each changed metric, explain: what changed, direction (improved/worsened/stable), clinical significance, and which guideline supports the interpretation.
6. Always end with a clear disclaimer that this is decision-support, not a diagnosis, and the physician must make final clinical decisions.
7. Keep the response concise, structured, and clinical — no marketing language.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { comparisonData, patientName } = body;

    if (!comparisonData) {
      return NextResponse.json({ error: "No comparison data provided" }, { status: 400 });
    }

    // Get clinic's NVIDIA API key from settings
    const settings = await getClinicSettings();
    const apiKey = settings?.nvidia_api_key;

    if (!apiKey) {
      return NextResponse.json(
        { error: "NVIDIA API key not configured. Add it in Settings → Billing & AI." },
        { status: 400 }
      );
    }

    // Build a focused clinical summary for the model
    const prompt = buildComparisonPrompt(comparisonData, patientName);

    const response = await fetch(NVIDIA_NIM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: MEDICAL_GROUNDING },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1024,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NVIDIA NIM API error:", response.status, errorText);
      return NextResponse.json(
        { error: `NVIDIA API error (${response.status}). Check your API key and try again.` },
        { status: response.status }
      );
    }

    const result = await response.json();
    const analysis = result.choices?.[0]?.message?.content || "No analysis returned.";

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error("AI analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate analysis" },
      { status: 500 }
    );
  }
}

function buildComparisonPrompt(data: any, patientName: string): string {
  const lines: string[] = [];

  lines.push(`PATIENT: ${patientName || "Unknown"}`);
  lines.push("");
  lines.push("=== LATEST REPORT ===");

  // Labs
  if (data.labComparison?.length) {
    lines.push("--- Laboratory Results ---");
    data.labComparison.forEach((lab: any) => {
      const latest = lab.latest;
      const prev = lab.previous;
      lines.push(`Test: ${lab.test_name}`);
      lines.push(`  Latest: ${latest?.result || "not available"} ${latest?.unit || ""} (ref: ${latest?.ref_range || "N/A"}) [${latest?.created_at?.split("T")[0] || "unknown date"}]`);
      if (prev) {
        lines.push(`  Previous: ${prev.result || "not available"} ${prev.unit || ""} (ref: ${prev.ref_range || "N/A"}) [${prev.created_at?.split("T")[0] || "unknown date"}]`);
      } else {
        lines.push(`  Previous: no prior result in 3-month window`);
      }
    });
  }

  // Latest note vitals
  const latestNote = data.latestNote;
  if (latestNote?.vitals && Object.keys(latestNote.vitals).length) {
    lines.push("--- Latest Vitals ---");
    const v = latestNote.vitals;
    if (v.bp_systolic) lines.push(`BP: ${v.bp_systolic}/${v.bp_diastolic || "N/A"}`);
    if (v.pulse) lines.push(`Pulse: ${v.pulse} bpm`);
    if (v.glucose) lines.push(`Glucose: ${v.glucose} mg/dL`);
    if (v.temperature) lines.push(`Temperature: ${v.temperature}°F`);
    if (v.oxygen_saturation) lines.push(`SpO2: ${v.oxygen_saturation}%`);
    if (v.respiratory_rate) lines.push(`Respiratory rate: ${v.respiratory_rate}`);
  }
  if (latestNote?.assessment) {
    lines.push(`Latest Diagnosis/Assessment: ${latestNote.assessment}`);
  }
  if (latestNote?.plan) {
    lines.push(`Latest Plan: ${latestNote.plan}`);
  }

  // Previous note
  const previousNote = data.previousNote;
  if (previousNote) {
    lines.push("");
    lines.push("=== PREVIOUS REPORT ===");
    if (previousNote.vitals && Object.keys(previousNote.vitals).length) {
      const v = previousNote.vitals;
      if (v.bp_systolic) lines.push(`BP: ${v.bp_systolic}/${v.bp_diastolic || "N/A"}`);
      if (v.pulse) lines.push(`Pulse: ${v.pulse} bpm`);
      if (v.glucose) lines.push(`Glucose: ${v.glucose} mg/dL`);
      if (v.temperature) lines.push(`Temperature: ${v.temperature}°F`);
      if (v.oxygen_saturation) lines.push(`SpO2: ${v.oxygen_saturation}%`);
      if (v.respiratory_rate) lines.push(`Respiratory rate: ${v.respiratory_rate}`);
    }
    if (previousNote.assessment) {
      lines.push(`Previous Diagnosis/Assessment: ${previousNote.assessment}`);
    }
    if (previousNote.plan) {
      lines.push(`Previous Plan: ${previousNote.plan}`);
    }
  }

  // HbA1c
  if (data.hba1cRecords?.length) {
    lines.push("");
    lines.push("--- HbA1c History ---");
    data.hba1cRecords.forEach((r: any) => {
      lines.push(`${r.date}: ${r.value}%`);
    });
  }

  // Blood sugar
  if (data.bloodSugarLogs?.length) {
    lines.push("");
    lines.push("--- Blood Sugar Logs ---");
    data.bloodSugarLogs.forEach((r: any) => {
      lines.push(`${r.recorded_at?.split("T")[0] || "unknown"}: ${r.value} mg/dL (${r.type})`);
    });
  }

  lines.push("");
  lines.push("=== INSTRUCTIONS ===");
  lines.push("Compare the latest vs previous report. Highlight what improved, worsened, or stayed stable. Reference relevant clinical guidelines (ADA, WHO, KDIGO, ACC/AHA). Be concise and structured.");

  return lines.join("\n");
}

export const runtime = "nodejs";
