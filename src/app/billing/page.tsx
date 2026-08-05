"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { downloadInvoicePDF, printInvoice } from "@/lib/pdf";
import { downloadCSV, EXPORT_CONFIGS } from "@/lib/export-csv";
import { BarChart3, Download, Plus, Printer, Search, CreditCard, FileText, Table2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getInvoices, createInvoice, markInvoicePaid } from "@/lib/queries";

interface Invoice {
  id: string;
  patient_name?: string;
  patients: { first_name: string; last_name: string } | null;
  created_at: string;
  total: number;
  status: string;
  status_text?: string;
}

export default function BillingPage() {
  const [search, setSearch] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [formPatientName, setFormPatientName] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentSaving, setPaymentSaving] = useState(false);

  const refreshInvoices = () => getInvoices().then((data) => setInvoices(data as Invoice[]));

  useEffect(() => {
    getInvoices().then((data) => {
      setInvoices(data as Invoice[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.id.toLowerCase().includes(search.toLowerCase()) ||
      (inv.patient_name || (inv.patients ? `${inv.patients.first_name} ${inv.patients.last_name}` : "")).toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const pendingTotal = invoices.filter((i) => i.status === "pending" || i.status === "overdue")
    .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Billing</h1>
          <p className="text-sm text-secondary">Manage invoices, payments, and revenue</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadCSV(EXPORT_CONFIGS.invoices(invoices, []))} disabled={invoices.length === 0}>
            <Table2 className="h-4 w-4" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setShowNewInvoice(true)}>
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Revenue", value: formatCurrency(totalRevenue), change: `${invoices.length} invoices` },
          { label: "Pending Payments", value: formatCurrency(pendingTotal), change: `${invoices.filter(i => i.status === "pending" || i.status === "overdue").length} unpaid` },
          { label: "Paid Invoices", value: invoices.filter(i => i.status === "paid").length.toString(), change: `${((invoices.filter(i => i.status === "paid").length / Math.max(invoices.length, 1)) * 100).toFixed(0)}% collection rate` },
          { label: "Avg. per Invoice", value: invoices.length > 0 ? formatCurrency(Math.round(totalRevenue / invoices.length)) : formatCurrency(0), change: "per invoice" },
        ].map((metric) => (
          <div key={metric.label} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-medium text-secondary">{metric.label}</p>
            <p className="mt-1 text-xl font-semibold text-primary">{metric.value}</p>
            <p className="text-xs text-success mt-0.5">{metric.change}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Revenue Overview</CardTitle>
            <BarChart3 className="h-4 w-4 text-secondary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <BarChart3 className="mx-auto h-10 w-10 text-secondary/40 mb-3" />
              <p className="text-sm text-secondary">Chart data will appear as invoices are generated</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoices</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary" />
              <input
                type="text"
                placeholder="Search invoices..."
                className="h-8 rounded-md border border-border bg-transparent pl-8 pr-2 text-xs placeholder:text-secondary/60 focus:outline-none focus:ring-1 focus:ring-ring"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-hover rounded animate-pulse" />
                    <div className="h-3 w-32 bg-hover rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <CreditCard className="h-12 w-12 text-secondary/40 mb-4" />
              <h3 className="text-sm font-medium text-primary">No invoices yet</h3>
              <p className="text-xs text-secondary mt-1 mb-4">Invoices will appear once billing is configured</p>
              <Button size="sm" onClick={() => setShowNewInvoice(true)}>
                <Plus className="h-4 w-4" />
                New Invoice
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Invoice</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Patient</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Amount</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-hover/50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-primary">{inv.id}</td>
                      <td className="px-5 py-3 text-sm text-secondary">
                        {inv.patient_name || (inv.patients ? `${inv.patients.first_name} ${inv.patients.last_name}` : "Unknown")}
                      </td>
                      <td className="px-5 py-3 text-sm text-secondary">{formatDate(inv.created_at)}</td>
                      <td className="px-5 py-3 text-sm font-medium text-primary">{formatCurrency(inv.total || 0)}</td>
                      <td className="px-5 py-3"><Badge status={inv.status as any} /></td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(inv.status === "pending" || inv.status_text === "pending") && (
                            <button onClick={async () => {
                              setPaymentSaving(true);
                              try {
                                await markInvoicePaid(inv.id);
                                toast.success("Invoice marked as paid!");
                                refreshInvoices();
                              } catch (err: any) { toast.error(err.message); }
                              finally { setPaymentSaving(false); }
                            }} disabled={paymentSaving}
                              className="text-xs font-medium text-success hover:text-success/80 px-2 py-1 rounded-md border border-success/30 hover:bg-success/5 transition-colors">
                              Mark Paid
                            </button>
                          )}
                          <button onClick={() => {
                            try {
                              downloadInvoicePDF({
                                invoiceNumber: inv.id.slice(0, 8).toUpperCase(),
                                patientName: inv.patient_name || (inv.patients ? `${inv.patients.first_name} ${inv.patients.last_name}` : "Patient"),
                                date: formatDate(inv.created_at),
                                dueDate: formatDate(inv.created_at),
                                status: inv.status || "pending",
                                items: [{ description: "Consultation / Services", quantity: 1, unitPrice: inv.total || 0, total: inv.total || 0 }],
                                subtotal: inv.total || 0,
                                taxPercentage: 0,
                                taxAmount: 0,
                                discount: 0,
                                total: inv.total || 0,
                              });
                            } catch { toast.error("Could not generate PDF"); }
                          }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover" title="Download PDF">
                            <FileText className="h-4 w-4" />
                          </button>
                          <button onClick={() => {
                            try {
                              printInvoice({
                                invoiceNumber: inv.id.slice(0, 8).toUpperCase(),
                                patientName: inv.patient_name || (inv.patients ? `${inv.patients.first_name} ${inv.patients.last_name}` : "Patient"),
                                date: formatDate(inv.created_at),
                                dueDate: formatDate(inv.created_at),
                                status: inv.status || "pending",
                                items: [{ description: "Consultation / Services", quantity: 1, unitPrice: inv.total || 0, total: inv.total || 0 }],
                                subtotal: inv.total || 0,
                                taxPercentage: 0,
                                taxAmount: 0,
                                discount: 0,
                                total: inv.total || 0,
                              });
                            } catch { toast.error("Could not generate PDF"); }
                          }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover" title="Print">
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNewInvoice} onClose={() => setShowNewInvoice(false)} title="New Invoice" description="Create a new invoice for a patient">
        <DialogContent>
          <div className="space-y-4">
            <Input label="Patient Name" placeholder="Enter patient name"
              value={formPatientName} onChange={(e) => setFormPatientName(e.target.value)} />
            <Input label="Amount" type="number" placeholder="Enter amount"
              value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
            <Input label="Description" placeholder="Enter description"
              value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowNewInvoice(false)}>Cancel</Button>
          <Button onClick={async () => {
            if (!formPatientName.trim()) { toast.error("Enter a patient name"); return; }
            if (!formAmount || isNaN(Number(formAmount))) { toast.error("Enter a valid amount"); return; }
            setFormSaving(true);
            try {
              await createInvoice({ patient_name: formPatientName, amount: Number(formAmount), description: formDescription });
              toast.success("Invoice created!");
              setShowNewInvoice(false);
              setFormPatientName("");
              setFormAmount("");
              setFormDescription("");
              getInvoices().then((data) => setInvoices(data as Invoice[]));
            } catch (err: any) {
              toast.error(err.message || "Failed to create invoice");
            } finally { setFormSaving(false); }
          }} disabled={formSaving} loading={formSaving}>Create Invoice</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
