"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pill, Plus, Search, AlertTriangle, TrendingDown, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getMedicines, addMedicine, updateMedicine, deleteMedicine, adjustStock } from "@/lib/queries";

interface Medicine {
  id: string;
  name: string;
  generic_name: string | null;
  category: string | null;
  manufacturer: string | null;
  unit: string;
  stock_quantity: number;
  reorder_level: number;
  unit_price: number;
  selling_price: number;
  requires_prescription: boolean;
  is_active: boolean;
}

export default function PharmacyPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Medicine | null>(null);

  // Stock adjustment
  const [adjustTarget, setAdjustTarget] = useState<Medicine | null>(null);
  const [adjustChange, setAdjustChange] = useState("0");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formGeneric, setFormGeneric] = useState("");
  const [formCategory, setFormCategory] = useState("tablet");
  const [formManufacturer, setFormManufacturer] = useState("");
  const [formUnit, setFormUnit] = useState("tablet");
  const [formStock, setFormStock] = useState("0");
  const [formReorder, setFormReorder] = useState("10");
  const [formUnitPrice, setFormUnitPrice] = useState("0");
  const [formSellPrice, setFormSellPrice] = useState("0");
  const [formRx, setFormRx] = useState(true);
  const [formSaving, setFormSaving] = useState(false);

  useEffect(() => {
    getMedicines().then((data) => {
      setMedicines(data as Medicine[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const refresh = () => getMedicines().then((data) => setMedicines(data as Medicine[]));

  const activeMeds = medicines.filter((m) => m.is_active);
  const filteredMeds = activeMeds.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.generic_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (m.manufacturer || "").toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = activeMeds.filter((m) => m.stock_quantity <= m.reorder_level).length;
  const totalValue = activeMeds.reduce((sum, m) => sum + (m.stock_quantity * (m.unit_price || 0)), 0);

  const openEdit = (med: Medicine) => {
    setEditTarget(med);
    setFormName(med.name);
    setFormGeneric(med.generic_name || "");
    setFormCategory(med.category || "tablet");
    setFormManufacturer(med.manufacturer || "");
    setFormUnit(med.unit || "tablet");
    setFormStock(String(med.stock_quantity));
    setFormReorder(String(med.reorder_level));
    setFormUnitPrice(String(med.unit_price || 0));
    setFormSellPrice(String(med.selling_price || 0));
    setFormRx(med.requires_prescription);
    setShowAdd(true);
  };

  const resetForm = () => {
    setEditTarget(null);
    setFormName("");
    setFormGeneric("");
    setFormCategory("tablet");
    setFormManufacturer("");
    setFormUnit("tablet");
    setFormStock("0");
    setFormReorder("10");
    setFormUnitPrice("0");
    setFormSellPrice("0");
    setFormRx(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Medicine name is required"); return; }
    setFormSaving(true);
    try {
      const payload = {
        name: formName,
        generic_name: formGeneric || undefined,
        category: formCategory,
        manufacturer: formManufacturer || undefined,
        unit: formUnit,
        stock_quantity: parseInt(formStock) || 0,
        reorder_level: parseInt(formReorder) || 10,
        unit_price: parseFloat(formUnitPrice) || 0,
        selling_price: parseFloat(formSellPrice) || 0,
        requires_prescription: formRx,
      };

      if (editTarget) {
        await updateMedicine(editTarget.id, payload);
        toast.success("Medicine updated!");
      } else {
        await addMedicine(payload);
        toast.success("Medicine added!");
      }

      setShowAdd(false);
      resetForm();
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally { setFormSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteMedicine(id);
      toast.success(`${name} removed`);
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAdjustStock = async () => {
    if (!adjustTarget) return;
    const change = parseInt(adjustChange) || 0;
    if (change === 0) { toast.error("Enter a non-zero adjustment"); return; }
    if (!adjustReason.trim()) { toast.error("Enter a reason for adjustment"); return; }
    setAdjustSaving(true);
    try {
      await adjustStock(adjustTarget.id, change, adjustReason);
      toast.success(`Stock adjusted: ${change > 0 ? "+" : ""}${change}`);
      setAdjustTarget(null);
      setAdjustChange("0");
      setAdjustReason("");
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to adjust stock");
    } finally { setAdjustSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Pharmacy Inventory</h1>
          <p className="text-sm text-secondary">Manage medicines, stock levels, and pricing</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }}>
          <Plus className="h-4 w-4" /> Add Medicine
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-secondary">Total Items</p>
            <Pill className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-1 text-xl font-semibold text-primary">{activeMeds.length}</p>
          <p className="text-xs text-success mt-0.5">active medicines</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-secondary">Low Stock</p>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
          <p className="mt-1 text-xl font-semibold text-primary">{lowStockCount}</p>
          <p className="text-xs text-warning mt-0.5">{lowStockCount > 0 ? "needs reorder" : "all stocked"}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-secondary">Total Stock Value</p>
            <Package className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-1 text-xl font-semibold text-primary">₹{totalValue.toLocaleString()}</p>
          <p className="text-xs text-secondary mt-0.5">at cost price</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-secondary">Total Stock</p>
            <TrendingDown className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-1 text-xl font-semibold text-primary">
            {activeMeds.reduce((sum, m) => sum + m.stock_quantity, 0)}
          </p>
          <p className="text-xs text-secondary mt-0.5">units in stock</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
        <input type="text" placeholder="Search by name, generic, or manufacturer..."
          className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-secondary/60 focus:outline-none focus:ring-1 focus:ring-ring"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-hover animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-hover rounded animate-pulse" />
                    <div className="h-3 w-32 bg-hover rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMeds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Pill className="h-12 w-12 text-secondary/40 mb-4" />
              <h3 className="text-sm font-medium text-primary">
                {search ? "No medicines match your search" : "No medicines in inventory"}
              </h3>
              <p className="text-xs text-secondary mt-1 mb-4">
                {search ? "Try a different search term" : "Add your first medicine to get started"}
              </p>
              {!search && (
                <Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }}>
                  <Plus className="h-4 w-4" /> Add Medicine
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Medicine</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Category</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Stock</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Unit Price</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Selling Price</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-secondary">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMeds.map((med) => {
                    const isLow = med.stock_quantity <= med.reorder_level;
                    return (
                      <tr key={med.id} className="hover:bg-hover/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light shrink-0">
                              <Pill className="h-4 w-4 text-accent" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-primary">{med.name}</p>
                              <p className="text-[10px] text-secondary">{med.generic_name || med.manufacturer || ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-secondary">{med.category || "—"}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${isLow ? "text-error" : "text-primary"}`}>
                              {med.stock_quantity}
                            </span>
                            {isLow && <AlertTriangle className="h-3.5 w-3.5 text-error" />}
                          </div>
                          <p className="text-[10px] text-secondary">{med.unit} &middot; reorder at {med.reorder_level}</p>
                        </td>
                        <td className="px-5 py-3 text-sm text-secondary">₹{med.unit_price || 0}</td>
                        <td className="px-5 py-3 text-sm font-medium text-primary">₹{med.selling_price || 0}</td>
                        <td className="px-5 py-3">
                          {med.requires_prescription ? (
                            <Badge variant="primary">Rx Required</Badge>
                          ) : (
                            <Badge variant="success">OTC</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(med)}
                              className="text-xs font-medium text-accent hover:text-accent/80 px-2 py-1 rounded transition-colors">
                              Edit
                            </button>
                            <button onClick={() => { setAdjustTarget(med); setAdjustChange("0"); setAdjustReason(""); }}
                              className="text-xs font-medium text-warning hover:text-warning/80 px-2 py-1 rounded transition-colors">
                              Stock
                            </button>
                            <button onClick={() => handleDelete(med.id, med.name)}
                              className="text-xs font-medium text-error hover:text-error/80 px-2 py-1 rounded transition-colors">
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onClose={() => { setShowAdd(false); resetForm(); }}
        title={editTarget ? "Edit Medicine" : "Add Medicine"}
        description={editTarget ? "Update medicine details and stock" : "Add a new medicine to inventory"}>
        <DialogContent>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <Input label="Medicine Name *" placeholder="e.g. Metformin 500mg"
              value={formName} onChange={(e) => setFormName(e.target.value)} />
            <Input label="Generic Name" placeholder="e.g. Metformin HCl"
              value={formGeneric} onChange={(e) => setFormGeneric(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Category</label>
                <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="tablet">Tablet</option>
                  <option value="capsule">Capsule</option>
                  <option value="injection">Injection</option>
                  <option value="syrup">Syrup</option>
                  <option value="cream">Cream</option>
                  <option value="inhaler">Inhaler</option>
                  <option value="drops">Drops</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Unit</label>
                <select value={formUnit} onChange={(e) => setFormUnit(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="tablet">Tablet</option>
                  <option value="capsule">Capsule</option>
                  <option value="vial">Vial</option>
                  <option value="ml">ml</option>
                  <option value="bottle">Bottle</option>
                  <option value="tube">Tube</option>
                  <option value="strip">Strip</option>
                  <option value="unit">Unit</option>
                </select>
              </div>
            </div>
            <Input label="Manufacturer" placeholder="e.g. Sun Pharma"
              value={formManufacturer} onChange={(e) => setFormManufacturer(e.target.value)} />
            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-secondary mb-3">Stock & Pricing</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Stock Quantity" type="number" placeholder="0"
                  value={formStock} onChange={(e) => setFormStock(e.target.value)} />
                <Input label="Reorder Level" type="number" placeholder="10"
                  value={formReorder} onChange={(e) => setFormReorder(e.target.value)} />
                <Input label="Unit Price (₹)" type="number" placeholder="0"
                  value={formUnitPrice} onChange={(e) => setFormUnitPrice(e.target.value)} />
                <Input label="Selling Price (₹)" type="number" placeholder="0"
                  value={formSellPrice} onChange={(e) => setFormSellPrice(e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formRx}
                onChange={(e) => setFormRx(e.target.checked)}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent" />
              <span className="text-sm text-primary">Requires prescription</span>
            </label>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</Button>
          <Button onClick={handleSave} disabled={formSaving} loading={formSaving}>
            {editTarget ? "Update" : "Add Medicine"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={!!adjustTarget} onClose={() => setAdjustTarget(null)}
        title="Adjust Stock" description={adjustTarget ? `Adjust stock level for ${adjustTarget.name}` : ""}>
        <DialogContent>
          <div className="space-y-4">
            {adjustTarget && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-hover">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-light">
                  <Package className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary">{adjustTarget.name}</p>
                  <p className="text-xs text-secondary">Current stock: {adjustTarget.stock_quantity} {adjustTarget.unit}</p>
                </div>
              </div>
            )}
            <Input label="Quantity Change" type="number" placeholder="e.g. 50 for in, -10 for out"
              value={adjustChange} onChange={(e) => setAdjustChange(e.target.value)} />
            <p className="text-xs text-secondary -mt-2">Positive for stock in, negative for stock out</p>
            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">Reason *</label>
              <select value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Select reason</option>
                <option value="purchase_order">Purchase Order Received</option>
                <option value="return">Return to Supplier</option>
                <option value="damaged">Damaged / Expired</option>
                <option value="dispensed">Dispensed to Patient</option>
                <option value="adjustment">Inventory Adjustment</option>
                <option value="transfer">Stock Transfer</option>
              </select>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAdjustTarget(null)}>Cancel</Button>
          <Button onClick={handleAdjustStock} disabled={adjustSaving} loading={adjustSaving}>
            {parseInt(adjustChange) > 0 ? "Add Stock" : "Remove Stock"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
