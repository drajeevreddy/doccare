"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { downloadLabReportPDF, printLabReport } from "@/lib/pdf";
import { FlaskConical, Plus, Search, Download, Printer, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getLabOrders, createLabOrder, getLabTests, addLabTest, removeLabTest, updateLabOrderResult } from "@/lib/queries";

interface LabOrder {
  id: string;
  patients: { first_name: string; last_name: string } | null;
  patient_name?: string;
  test_name: string;
  doctor_name: string;
  created_at: string;
  status: string;
  result: string;
}

interface LabTest {
  id: string;
  name: string;
  category: string | null;
  sample_type: string | null;
  price: number | null;
  instructions: string | null;
  is_active: boolean;
}

export default function LaboratoryPage() {
  const [search, setSearch] = useState("");
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [showAddTest, setShowAddTest] = useState(false);

  // Lab results entry
  const [resultTarget, setResultTarget] = useState<LabOrder | null>(null);
  const [formResult, setFormResult] = useState("");
  const [formRefRange, setFormRefRange] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formIsAbnormal, setFormIsAbnormal] = useState(false);
  const [resultSaving, setResultSaving] = useState(false);

  // Add test form
  const [testName, setTestName] = useState("");
  const [testCategory, setTestCategory] = useState("");
  const [testSample, setTestSample] = useState("");
  const [testPrice, setTestPrice] = useState("");
  const [testInstructions, setTestInstructions] = useState("");
  const [testSaving, setTestSaving] = useState(false);

  // New order form state
  const [formPatient, setFormPatient] = useState("");
  const [formTest, setFormTest] = useState("");
  const [formPriority, setFormPriority] = useState("routine");
  const [formSaving, setFormSaving] = useState(false);

  const refreshOrders = () => {
    getLabOrders().then((data) => setLabOrders(data as LabOrder[]));
  };

  useEffect(() => {
    Promise.all([
      getLabOrders(),
      getLabTests(),
    ]).then(([orders, tests]) => {
      setLabOrders(orders as LabOrder[]);
      setLabTests(tests as LabTest[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filteredOrders = labOrders.filter((o) => {
    const patientName = o.patient_name ||
      (o.patients ? `${o.patients.first_name} ${o.patients.last_name}` : "");
    return patientName.toLowerCase().includes(search.toLowerCase()) || o.id.includes(search);
  });

  const pendingCount = labOrders.filter((o) =>
    o.status === "in_progress" || o.status === "ordered" || o.status === "sample_collected"
  ).length;

  const handleCreateOrder = async () => {
    if (!formPatient.trim()) { toast.error("Please enter a patient name"); return; }
    if (!formTest) { toast.error("Please select a test"); return; }
    setFormSaving(true);
    try {
      await createLabOrder({
        patient_name: formPatient,
        test_name: formTest,
        priority: formPriority,
      });
      toast.success("Lab order created successfully!");
      setShowNewOrder(false);
      setFormPatient("");
      setFormTest("");
      setFormPriority("routine");
      refreshOrders();
    } catch (err: any) {
      toast.error(err.message || "Failed to create lab order");
    } finally {
      setFormSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Laboratory</h1>
          <p className="text-sm text-secondary">Manage lab tests, orders, and results with PDF export</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowNewOrder(true)}>
            <Plus className="h-4 w-4" />
            New Lab Order
          </Button>
        </div>
      </div>

      <Tabs
        tabs={[
          {
            id: "orders",
            label: "Lab Orders",
            badge: pendingCount || undefined,
            content: (
              <div className="space-y-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
                  <input type="text" placeholder="Search orders..."
                    className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-secondary/60 focus:outline-none focus:ring-1 focus:ring-ring"
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Card>
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="p-6 space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-4">
                            <div className="h-9 w-9 rounded-lg bg-hover animate-pulse" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-40 bg-hover rounded animate-pulse" />
                              <div className="h-3 w-32 bg-hover rounded animate-pulse" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : labOrders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <FlaskConical className="h-12 w-12 text-secondary/40 mb-4" />
                        <h3 className="text-sm font-medium text-primary">No lab orders yet</h3>
                        <p className="text-xs text-secondary mt-1 mb-4">Create your first lab order</p>
                        <Button size="sm" onClick={() => setShowNewOrder(true)}>
                          <Plus className="h-4 w-4" /> New Lab Order
                        </Button>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {filteredOrders.map((order) => {
                          const patientName = order.patient_name ||
                            (order.patients ? `${order.patients.first_name} ${order.patients.last_name}` : "Unknown");
                          return (
                            <div key={order.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-hover/50 transition-colors">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light shrink-0">
                                <FlaskConical className="h-4 w-4 text-accent" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-primary">{patientName}</p>
                                <p className="text-xs text-secondary">{order.test_name} &middot; {order.doctor_name} &middot; {formatDate(order.created_at)}</p>
                              </div>
                              <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-primary">{order.result || "--"}</p>
                                <Badge status={order.status as any} />
                              </div>
                              {(order.status === "ordered" || order.status === "sample_collected" || order.status === "in_progress") && (
                                <button
                                  onClick={() => { setResultTarget(order); setFormResult(""); setFormRefRange(""); setFormUnit(""); setFormIsAbnormal(false); }}
                                  className="text-xs font-medium text-accent hover:text-accent/80 px-2 py-1 rounded-md hover:bg-accent-light transition-colors"
                                  title="Enter Result"
                                >
                                  Enter Result
                                </button>
                              )}
                              {order.status === "completed" && (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => {
                                    try {
                                      downloadLabReportPDF({
                                        orderId: order.id.slice(0, 8).toUpperCase(),
                                        patientName,
                                        doctorName: order.doctor_name,
                                        date: formatDate(order.created_at),
                                        tests: [{ name: order.test_name, result: order.result || "", referenceRange: "", unit: "", isAbnormal: false }],
                                      });
                                    } catch { toast.error("Could not generate PDF"); }
                                  }}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover" title="Download PDF">
                                    <FileText className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => {
                                    try {
                                      printLabReport({
                                        orderId: order.id.slice(0, 8).toUpperCase(),
                                        patientName,
                                        doctorName: order.doctor_name,
                                        date: formatDate(order.created_at),
                                        tests: [{ name: order.test_name, result: order.result || "", referenceRange: "", unit: "", isAbnormal: false }],
                                      });
                                    } catch { toast.error("Could not generate PDF"); }
                                  }}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-hover" title="Print">
                                    <Printer className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ),
          },
          {
            id: "catalog",
            label: "Test Catalog",
            badge: labTests.length || undefined,
            content: (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-secondary">{labTests.length} tests configured</p>
                  <Button size="sm" variant="outline" onClick={() => setShowAddTest(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Test
                  </Button>
                </div>
                <Card>
                  <CardContent className="p-0">
                    {labTests.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <FlaskConical className="h-10 w-10 text-secondary/40 mb-3" />
                        <p className="text-sm text-secondary">No tests in catalog</p>
                        <p className="text-xs text-secondary mt-1 mb-4">Add lab tests to build your catalog</p>
                        <Button size="sm" variant="outline" onClick={() => setShowAddTest(true)}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add Test
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Test Name</th>
                              <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Category</th>
                              <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Sample Type</th>
                              <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Price</th>
                              <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {labTests.map((test) => (
                              <tr key={test.id} className="hover:bg-hover/50">
                                <td className="px-5 py-3 text-sm font-medium text-primary">{test.name}</td>
                                <td className="px-5 py-3"><Badge variant="primary">{test.category || "—"}</Badge></td>
                                <td className="px-5 py-3 text-sm text-secondary">{test.sample_type || "—"}</td>
                                <td className="px-5 py-3 text-sm font-medium text-primary">₹{test.price || 0}</td>
                                <td className="px-5 py-3">
                                  <button
                                    onClick={() => removeLabTest(test.id).then(() => {
                                      setLabTests((prev) => prev.filter((t) => t.id !== test.id));
                                      toast.success(`${test.name} removed`);
                                    }).catch((err) => toast.error(err.message))}
                                    className="text-xs text-error hover:text-error/80 transition-colors"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ),
          },
        ]}
      />

      <Dialog open={showNewOrder} onClose={() => setShowNewOrder(false)}
        title="New Lab Order" description="Create a new laboratory order">
        <DialogContent>
          <div className="space-y-4">
            <Input label="Patient Name" placeholder="Enter patient name"
              value={formPatient} onChange={(e) => setFormPatient(e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Test</label>
              <select value={formTest} onChange={(e) => setFormTest(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Select test</option>
                {labTests.map((test) => (
                  <option key={test.id} value={test.name}>{test.name} — ₹{test.price || 0}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Priority</label>
              <select value={formPriority} onChange={(e) => setFormPriority(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT</option>
              </select>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowNewOrder(false)}>Cancel</Button>
          <Button onClick={handleCreateOrder} disabled={formSaving} loading={formSaving}>
            Create Order
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Enter Result Dialog */}
      <Dialog open={!!resultTarget} onClose={() => setResultTarget(null)}
        title="Enter Lab Result" description="Record the test result for this order">
        <DialogContent>
          <div className="space-y-4">
            {resultTarget && (
              <div className="p-3 rounded-lg bg-hover text-sm">
                <span className="font-medium text-primary">{resultTarget.test_name}</span>
                <span className="text-secondary ml-2">— {resultTarget.patient_name || (resultTarget.patients ? `${resultTarget.patients.first_name} ${resultTarget.patients.last_name}` : "Unknown")}</span>
              </div>
            )}
            <Input label="Result Value" placeholder="e.g. 5.7"
              value={formResult} onChange={(e) => setFormResult(e.target.value)} />
            <Input label="Reference Range" placeholder="e.g. 4.0 - 5.6"
              value={formRefRange} onChange={(e) => setFormRefRange(e.target.value)} />
            <Input label="Unit" placeholder="e.g. %"
              value={formUnit} onChange={(e) => setFormUnit(e.target.value)} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formIsAbnormal}
                onChange={(e) => setFormIsAbnormal(e.target.checked)}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent" />
              <span className="text-sm text-primary">Mark as abnormal</span>
            </label>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setResultTarget(null)}>Cancel</Button>
          <Button onClick={async () => {
            if (!formResult.trim()) { toast.error("Enter a result value"); return; }
            if (!resultTarget) return;
            setResultSaving(true);
            try {
              await updateLabOrderResult(resultTarget.id, {
                result: formResult,
                ref_range: formRefRange,
                unit: formUnit,
                is_abnormal: formIsAbnormal,
              });
              toast.success("Result recorded!");
              setResultTarget(null);
              refreshOrders();
            } catch (err: any) {
              toast.error(err.message || "Failed to save result");
            } finally { setResultSaving(false); }
          }} disabled={resultSaving} loading={resultSaving}>
            Save Result
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Add Test Dialog */}
      <Dialog open={showAddTest} onClose={() => setShowAddTest(false)}
        title="Add Lab Test" description="Add a new test to the catalog">
        <DialogContent>
          <div className="space-y-4">
            <Input label="Test Name *" placeholder="e.g. HbA1c"
              value={testName} onChange={(e) => setTestName(e.target.value)} />
            <Input label="Category" placeholder="e.g. Diabetes"
              value={testCategory} onChange={(e) => setTestCategory(e.target.value)} />
            <Input label="Sample Type" placeholder="e.g. Blood"
              value={testSample} onChange={(e) => setTestSample(e.target.value)} />
            <Input label="Price" type="number" placeholder="e.g. 800"
              value={testPrice} onChange={(e) => setTestPrice(e.target.value)} />
            <Input label="Instructions" placeholder="Any special instructions"
              value={testInstructions} onChange={(e) => setTestInstructions(e.target.value)} />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAddTest(false)}>Cancel</Button>
          <Button onClick={async () => {
            if (!testName.trim()) { toast.error("Test name is required"); return; }
            setTestSaving(true);
            try {
              await addLabTest({
                name: testName,
                category: testCategory || undefined,
                sample_type: testSample || undefined,
                price: testPrice ? Number(testPrice) : undefined,
                instructions: testInstructions || undefined,
              });
              toast.success("Test added to catalog!");
              setShowAddTest(false);
              setTestName("");
              setTestCategory("");
              setTestSample("");
              setTestPrice("");
              setTestInstructions("");
              getLabTests().then((data) => setLabTests(data as LabTest[]));
            } catch (err: any) {
              toast.error(err.message || "Failed to add test");
            } finally { setTestSaving(false); }
          }} disabled={testSaving} loading={testSaving}>
            Add Test
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
