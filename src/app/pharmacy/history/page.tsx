"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, ArrowDown, ArrowUp, Package, Search, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getStockHistory } from "@/lib/queries";

interface StockMovement {
  id: string;
  action: string;
  user_name: string;
  created_at: string;
}

function parseMovement(action: string) {
  const match = action.match(/Stock adjusted for (.+?): ([+-]?\d+) \((.+)\)/);
  if (match) {
    return {
      medicineName: match[1],
      change: parseInt(match[2]),
      reason: match[3],
      isIn: parseInt(match[2]) > 0,
    };
  }
  return { medicineName: action, change: 0, reason: "unknown", isIn: false };
}

export default function StockHistoryPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterReason, setFilterReason] = useState("all");
  const [filterDirection, setFilterDirection] = useState<"all" | "in" | "out">("all");

  useEffect(() => {
    getStockHistory().then((data) => {
      setMovements(data as StockMovement[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = movements.filter((m) => {
    const parsed = parseMovement(m.action);
    const matchesSearch = parsed.medicineName.toLowerCase().includes(search.toLowerCase());
    const matchesReason = filterReason === "all" || parsed.reason === filterReason;
    const matchesDir = filterDirection === "all" ||
      (filterDirection === "in" && parsed.isIn) ||
      (filterDirection === "out" && !parsed.isIn);
    return matchesSearch && matchesReason && matchesDir;
  });

  const totalIn = filtered.filter((m) => parseMovement(m.action).isIn)
    .reduce((s, m) => s + parseMovement(m.action).change, 0);
  const totalOut = filtered.filter((m) => !parseMovement(m.action).isIn)
    .reduce((s, m) => s + Math.abs(parseMovement(m.action).change), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/pharmacy">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-primary">Stock Movement History</h1>
            <p className="text-sm text-secondary">Track all inventory adjustments and movements</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-secondary">Total Movements</p>
            <Package className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-1 text-xl font-semibold text-primary">{filtered.length}</p>
          <p className="text-xs text-secondary mt-0.5">filtered entries</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-secondary">Stock Added</p>
            <ArrowUp className="h-4 w-4 text-success" />
          </div>
          <p className="mt-1 text-xl font-semibold text-success">+{totalIn}</p>
          <p className="text-xs text-secondary mt-0.5">units in</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-secondary">Stock Removed</p>
            <ArrowDown className="h-4 w-4 text-error" />
          </div>
          <p className="mt-1 text-xl font-semibold text-error">-{totalOut}</p>
          <p className="text-xs text-secondary mt-0.5">units out</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
          <input type="text" placeholder="Search by medicine name..."
            className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-secondary/60 focus:outline-none focus:ring-1 focus:ring-ring"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={filterDirection} onChange={(e) => setFilterDirection(e.target.value as any)}
          className="h-9 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">All Directions</option>
          <option value="in">Stock In</option>
          <option value="out">Stock Out</option>
        </select>
        <select value={filterReason} onChange={(e) => setFilterReason(e.target.value)}
          className="h-9 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">All Reasons</option>
          <option value="purchase_order">Purchase Order</option>
          <option value="dispensed">Dispensed</option>
          <option value="damaged">Damaged</option>
          <option value="return">Return</option>
          <option value="adjustment">Adjustment</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-10 w-10 rounded-lg bg-hover" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-hover rounded" />
                    <div className="h-3 w-32 bg-hover rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Package className="h-12 w-12 text-secondary/40 mb-4" />
              <h3 className="text-sm font-medium text-primary">No stock movements found</h3>
              <p className="text-xs text-secondary mt-1 mb-4">
                {movements.length === 0 ? "Adjust stock in the pharmacy to record movements" : "Try different filters"}
              </p>
              {movements.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => { setSearch(""); setFilterReason("all"); setFilterDirection("all"); }}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((m) => {
                const parsed = parseMovement(m.action);
                return (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-hover/50 transition-colors">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
                      parsed.isIn ? "bg-success/10" : "bg-error/10"
                    }`}>
                      {parsed.isIn ? (
                        <ArrowUp className="h-4 w-4 text-success" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-error" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-primary">{parsed.medicineName}</p>
                        <span className={`text-sm font-semibold ${
                          parsed.isIn ? "text-success" : "text-error"
                        }`}>
                          {parsed.isIn ? "+" : ""}{parsed.change}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={parsed.isIn ? "success" : "error"}>
                          {parsed.reason.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-secondary">{formatDate(m.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
