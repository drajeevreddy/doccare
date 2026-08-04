/**
 * Export utility for generating CSV files from data
 */

interface CSVConfig {
  filename: string;
  headers: string[];
  rows: Record<string, any>[];
  columnMap: Record<string, string>; // maps header key to field name
}

export function generateCSV(config: CSVConfig): string {
  const { headers, rows, columnMap } = config;

  // Header row
  const headerRow = headers.map((h) => escapeCSVField(h)).join(",");

  // Data rows
  const dataRows = rows.map((row) => {
    return headers
      .map((header) => {
        const field = columnMap[header];
        const value = field ? resolveNestedValue(row, field) : "";
        return escapeCSVField(formatValue(value));
      })
      .join(",");
  });

  return [headerRow, ...dataRows].join("\n");
}

function escapeCSVField(value: any): string {
  const str = String(value ?? "");
  // If the value contains a comma, newline, or double quote, wrap in quotes
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function resolveNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => {
    return current?.[key] !== undefined ? current[key] : "";
  }, obj);
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return value.toISOString().split("T")[0];
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

/**
 * Downloads a CSV file in the browser
 */
export function downloadCSV(config: CSVConfig): void {
  const csvContent = generateCSV(config);
  const BOM = "\uFEFF"; // Excel-compatible BOM for Unicode
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${config.filename.replace(/[^a-zA-Z0-9-_]/g, "-")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Predefined export configurations
 */

export const EXPORT_CONFIGS = {
  revenue: (data: any[]) => ({
    filename: `revenue-report-${new Date().toISOString().split("T")[0]}`,
    headers: ["Month", "Year", "Revenue", "Invoice Count", "Paid Count", "Collection Rate"],
    columnMap: {
      Month: "month",
      Year: "year",
      Revenue: "revenue",
      "Invoice Count": "count",
      "Paid Count": "paid",
      "Collection Rate": "collectionRate",
    },
    rows: data.map((r: any) => ({
      ...r,
      collectionRate: r.count > 0 ? `${Math.round((r.paid / r.count) * 100)}%` : "0%",
    })),
  }),

  invoices: (data: any[], patients: any[]) => ({
    filename: `invoices-${new Date().toISOString().split("T")[0]}`,
    headers: ["Invoice ID", "Patient", "Amount", "Status", "Date"],
    columnMap: {
      "Invoice ID": "id",
      Patient: "patientName",
      Amount: "total",
      Status: "status",
      Date: "date",
    },
    rows: data.map((inv: any, i: number) => ({
      id: inv.id?.slice(0, 8) || `INV-${i}`,
      patientName: inv.patient_name || (inv.patients
        ? `${inv.patients.first_name} ${inv.patients.last_name}`
        : "Unknown"),
      total: Number(inv.total || 0),
      status: inv.status_text || inv.status || "pending",
      date: inv.created_at?.split("T")[0] || "",
    })),
  }),

  patients: (data: any[]) => ({
    filename: `patients-${new Date().toISOString().split("T")[0]}`,
    headers: ["Name", "Date of Birth", "Gender", "Phone", "Email", "Blood Group", "Registered"],
    columnMap: {
      Name: "name",
      "Date of Birth": "dob",
      Gender: "gender",
      Phone: "phone",
      Email: "email",
      "Blood Group": "bloodGroup",
      Registered: "registeredDate",
    },
    rows: data.map((p: any) => ({
      name: `${p.first_name || ""} ${p.last_name || ""}`.trim(),
      dob: p.date_of_birth || "",
      gender: p.gender || "",
      phone: p.phone || "",
      email: p.email || "",
      bloodGroup: p.blood_group || "",
      registeredDate: p.created_at?.split("T")[0] || "",
    })),
  }),

  labOrders: (data: any[]) => ({
    filename: `lab-orders-${new Date().toISOString().split("T")[0]}`,
    headers: ["Test Name", "Patient", "Status", "Result", "Priority", "Date"],
    columnMap: {
      "Test Name": "testName",
      Patient: "patient",
      Status: "status",
      Result: "result",
      Priority: "priority",
      Date: "date",
    },
    rows: data.map((l: any) => ({
      testName: l.test_name || "",
      patient: l.patient_name || (l.patients
        ? `${l.patients.first_name} ${l.patients.last_name}`
        : "Unknown"),
      status: l.status || "",
      result: l.result || "",
      priority: l.priority || "",
      date: l.created_at?.split("T")[0] || "",
    })),
  }),

  appointments: (data: any[]) => ({
    filename: `appointments-${new Date().toISOString().split("T")[0]}`,
    headers: ["Patient", "Doctor", "Date", "Time", "Type", "Status"],
    columnMap: {
      Patient: "patient",
      Doctor: "doctor",
      Date: "date",
      Time: "time",
      Type: "type",
      Status: "status",
    },
    rows: data.map((a: any) => ({
      patient: a.patient_name || (a.patients
        ? `${a.patients.first_name} ${a.patients.last_name}`
        : "Unknown"),
      doctor: a.doctor_name || "",
      date: a.appointment_date || "",
      time: a.appointment_time?.slice(0, 5) || "",
      type: a.type || "",
      status: a.status || "",
    })),
  }),
};

export type ExportType = keyof typeof EXPORT_CONFIGS;
