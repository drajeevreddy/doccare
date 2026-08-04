/**
 * Calendar utilities for generating .ics files and calendar links
 */

interface AppointmentEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMinutes?: number;
  location?: string;
  doctorName?: string;
  patientName?: string;
}

function escapeICS(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function generateICSFile(event: AppointmentEvent): string {
  const duration = event.durationMinutes || 30;
  const startDate = event.date.replace(/-/g, "");
  const startTime = (event.time || "09:00").replace(/:/g, "");
  const startUTC = `${startDate}T${startTime}00`;

  // Calculate end time
  const startMs =
    new Date(`${event.date}T${event.time || "09:00"}:00`).getTime() +
    duration * 60 * 1000;
  const endDate = new Date(startMs);
  const endUTC =
    endDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const location = event.location
    ? `\\nLOCATION:${escapeICS(event.location)}`
    : "";
  const desc = event.description
    ? `\\nDESCRIPTION:${escapeICS(event.description)}`
    : "";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DocCare//Appointment//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@doccare`,
    `DTSTART:${startUTC}`,
    `DTEND:${endUTC}`,
    `DTSTAMP:${now}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `${location}`,
    `${desc}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder: ${escapeICS(event.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\\r\\n");
}

export function generateGoogleCalendarUrl(event: AppointmentEvent): string {
  const startDate = event.date.replace(/-/g, "");
  const startTime = (event.time || "09:00").replace(/:/g, "");
  const startUTC = `${startDate}T${startTime}00`;

  const duration = event.durationMinutes || 30;
  const startMs =
    new Date(`${event.date}T${event.time || "09:00"}:00`).getTime() +
    duration * 60 * 1000;
  const endDate = new Date(startMs);
  const endUTC =
    endDate.toISOString().replace(/[-:]/g, "").split(".")[0];

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${startUTC}/${endUTC}`,
    details: event.description || `Appointment with ${event.doctorName || "doctor"}`,
    location: event.location || "DocCare Clinic",
    ctz: "Asia/Kolkata",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateOutlookCalendarUrl(event: AppointmentEvent): string {
  const startDate = `${event.date}T${event.time || "09:00"}:00`;
  const duration = event.durationMinutes || 30;
  const startMs =
    new Date(`${event.date}T${event.time || "09:00"}:00`).getTime() +
    duration * 60 * 1000;
  const endDate = new Date(startMs);
  const endUTC = endDate.toISOString();

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    startdt: startDate,
    enddt: endUTC,
    subject: event.title,
    body: event.description || `Appointment with ${event.doctorName || "doctor"}`,
    location: event.location || "DocCare Clinic",
    allday: "false",
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function downloadICSFile(event: AppointmentEvent): string {
  const icsContent = generateICSFile(event);
  const blob = new Blob([icsContent], {
    type: "text/calendar;charset=utf-8",
  });
  return URL.createObjectURL(blob);
}
