"use client";

import jsPDF from "jspdf";

interface MedicineItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface PrescriptionData {
  prescriptionId: string;
  patientName: string;
  patientAge: string | number;
  patientGender: string;
  doctorName: string;
  date: string;
  diagnosis: string;
  medicines: MedicineItem[];
  notes?: string;
}

function drawHeader(doc: jsPDF, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("DocCare", pageWidth / 2, 20, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Electronic Medical Records System", pageWidth / 2, 26, { align: "center" });
  doc.setDrawColor(17, 24, 39);
  doc.line(15, 30, pageWidth - 15, 30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, 40, { align: "center" });
}

function openInNewWindow(doc: jsPDF) {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url);
}

// --- Prescription PDF ---

function generatePrescriptionPDF(data: PrescriptionData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  drawHeader(doc, "PRESCRIPTION");

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Rx #: ${data.prescriptionId}`, 15, 50);
  doc.text(`Date: ${data.date}`, pageWidth - 15, 50, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.text("Patient", 15, 62);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.patientName} | ${data.patientAge} yrs | ${data.patientGender}`, 15, 70);

  doc.setFont("helvetica", "bold");
  doc.text("Prescribed By", pageWidth / 2 + 10, 62);
  doc.setFont("helvetica", "normal");
  doc.text(`Dr. ${data.doctorName}`, pageWidth / 2 + 10, 70);

  doc.setFont("helvetica", "bold");
  doc.text("Diagnosis:", 15, 84);
  doc.setFont("helvetica", "normal");
  doc.text(data.diagnosis, 40, 84);

  doc.line(15, 90, pageWidth - 15, 90);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  let y = 98;
  doc.text("Medicines", 15, y);
  doc.line(15, y + 2, pageWidth - 15, y + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  data.medicines.forEach((med, i) => {
    y += 7;
    doc.text(`${i + 1}. ${med.name} ${med.dosage}`, 18, y);
    y += 5;
    doc.text(`   ${med.frequency} for ${med.duration}`, 22, y);
    if (med.instructions) {
      y += 5;
      doc.text(`   ${med.instructions}`, 22, y);
    }
  });

  if (data.notes) {
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Notes:", 15, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(data.notes, 15, y);
  }

  y = Math.max(y + 15, 250);
  doc.line(15, y, pageWidth - 15, y);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text("This is a computer-generated prescription.", pageWidth / 2, y + 7, { align: "center" });

  return doc;
}

export function downloadPrescriptionPDF(data: PrescriptionData) {
  const doc = generatePrescriptionPDF(data);
  doc.save(`prescription-${data.prescriptionId}.pdf`);
}

export function printPrescription(data: PrescriptionData) {
  const doc = generatePrescriptionPDF(data);
  openInNewWindow(doc);
}

// --- Invoice PDF ---

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceData {
  invoiceNumber: string;
  patientName: string;
  date: string;
  dueDate: string;
  status: string;
  items: InvoiceItem[];
  subtotal: number;
  taxPercentage: number;
  taxAmount: number;
  discount: number;
  total: number;
}

function generateInvoicePDF(data: InvoiceData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  drawHeader(doc, "TAX INVOICE");

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice #: ${data.invoiceNumber}`, 15, 50);
  doc.text(`Date: ${data.date}`, pageWidth - 15, 50, { align: "right" });
  doc.text(`Due Date: ${data.dueDate}`, pageWidth - 15, 56, { align: "right" });
  doc.text(`Status: ${data.status}`, pageWidth - 15, 62, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.text("Patient:", 15, 72);
  doc.setFont("helvetica", "normal");
  doc.text(data.patientName, 30, 72);

  let y = 88;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Description", 15, y);
  doc.text("Qty", 130, y);
  doc.text("Rate", 150, y);
  doc.text("Amount", 175, y);
  doc.line(15, y + 2, pageWidth - 15, y + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  data.items.forEach((item) => {
    y += 7;
    doc.text(item.description, 15, y);
    doc.text(`${item.quantity}`, 130, y);
    doc.text(`\u20B9${item.unitPrice}`, 150, y);
    doc.text(`\u20B9${item.total}`, 175, y);
  });

  y += 10;
  doc.line(120, y, pageWidth - 15, y);
  y += 6;
  const drawLine = (label: string, value: string, isBold = false) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(isBold ? 10 : 9);
    doc.text(label, 130, y);
    doc.text(value, 175, y);
    y += 6;
  };
  drawLine("Subtotal:", `\u20B9${data.subtotal}`);
  drawLine(`Tax (${data.taxPercentage}%):`, `\u20B9${data.taxAmount}`);
  if (data.discount > 0) {
    drawLine("Discount:", `-\u20B9${data.discount}`);
  }
  drawLine("Total:", `\u20B9${data.total}`, true);

  return doc;
}

export function downloadInvoicePDF(data: InvoiceData) {
  const doc = generateInvoicePDF(data);
  doc.save(`invoice-${data.invoiceNumber}.pdf`);
}

export function printInvoice(data: InvoiceData) {
  const doc = generateInvoicePDF(data);
  openInNewWindow(doc);
}

// --- Lab Report PDF ---

interface LabTestResult {
  name: string;
  result: string;
  referenceRange: string;
  unit: string;
  isAbnormal: boolean;
}

interface LabReportData {
  orderId: string;
  patientName: string;
  doctorName: string;
  date: string;
  tests: LabTestResult[];
  notes?: string;
}

function generateLabReportPDF(data: LabReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  drawHeader(doc, "LABORATORY REPORT");

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Order #: ${data.orderId}`, 15, 50);
  doc.text(`Date: ${data.date}`, pageWidth - 15, 50, { align: "right" });
  doc.text(`Patient: ${data.patientName}`, 15, 58);
  doc.text(`Doctor: ${data.doctorName}`, 15, 66);

  let y = 82;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Test", 15, y);
  doc.text("Result", 90, y);
  doc.text("Reference Range", 135, y);
  doc.text("Unit", 185, y);
  doc.line(15, y + 2, pageWidth - 15, y + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  data.tests.forEach((test) => {
    y += 7;
    doc.text(test.name, 15, y);
    doc.setFont(test.isAbnormal ? "helvetica" : "helvetica", test.isAbnormal ? "bold" : "normal");
    doc.text(test.result, 90, y);
    doc.setFont("helvetica", "normal");
    doc.text(test.referenceRange, 135, y);
    doc.text(test.unit, 185, y);
    if (test.isAbnormal) {
      y += 4;
      doc.setFontSize(7);
      doc.setTextColor(220, 38, 38);
      doc.text("Abnormal", 15, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
    }
  });

  if (data.notes) {
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Notes:", 15, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(data.notes, 15, y);
  }

  return doc;
}

export function downloadLabReportPDF(data: LabReportData) {
  const doc = generateLabReportPDF(data);
  doc.save(`lab-report-${data.orderId}.pdf`);
}

export function printLabReport(data: LabReportData) {
  const doc = generateLabReportPDF(data);
  openInNewWindow(doc);
}
