"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, RefreshCw, Loader2, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

interface Movement {
  id: number;
  movement_type: "receipt" | "issue" | "adjustment";
  movement_date: string;
  item_name: string;
  item_code: string;
  unit: string;
  quantity: number;
  from_party: string | null;
  to_party: string | null;
  reference: string;
  officer: string | null;
  balance_after: number | null;
}

export default function StockMovements() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (typeFilter !== "all") params.set("type", typeFilter);
      params.set("limit", "150");

      const res = await fetch(`/api/movements?${params.toString()}`);
      if (res.ok) {
        const d = await res.json();
        setMovements(d.data || []);
      }
    } catch (err) {
      console.error("Failed to load movements:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, typeFilter]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const handleDeleteMovement = async (m: Movement) => {
    if (!confirm(`Are you sure you want to delete this ${m.movement_type.toUpperCase()} record (${m.reference})? Inventory stock balance will be adjusted accordingly.`)) {
      return;
    }
    const key = `${m.movement_type}-${m.id}`;
    setDeletingKey(key);
    try {
      const res = await fetch(`/api/movements?id=${m.id}&type=${m.movement_type}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete movement record.");
      await fetchMovements();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting movement record.");
    } finally {
      setDeletingKey(null);
    }
  };

  const handleExport = () => {
    if (movements.length === 0) {
      alert("No stock movement records available to export. All records have been deleted or none exist.");
      return;
    }

    const data = movements.map((m, i) => ({

      "No.": i + 1,
      Date: m.movement_date,
      Type: m.movement_type.toUpperCase(),
      "Reference #": m.reference,
      "Item Code": m.item_code,
      "Consumable Item": m.item_name,
      Quantity: m.quantity,
      Unit: m.unit,
      "From / Supplier": m.from_party || "—",
      "To / Station": m.to_party || "—",
      "Recorded By": m.officer || "—",
      "Balance After": m.balance_after !== null ? m.balance_after : "—",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Movements");
    XLSX.writeFile(wb, `DVLA_Stock_Movements_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Movement Audit Trail</h1>
            <p className="text-sm text-slate-500">Immutable ledger of all stock receipts, issues, and adjustments.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExport} variant="outline" className="gap-2 border-slate-300 text-slate-700 h-9">
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
            <Button variant="outline" size="icon" onClick={fetchMovements} className="h-9 w-9 text-slate-600">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row items-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search items, references, officers, suppliers..."
              className="pl-9 bg-slate-50 border-slate-200 focus:bg-white text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px] bg-slate-50 text-xs">
              <SelectValue placeholder="Movement Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Movements</SelectItem>
              <SelectItem value="receipt">Stock Receipts (Deliveries)</SelectItem>
              <SelectItem value="issue">Stock Issues (Dispatches)</SelectItem>
              <SelectItem value="adjustment">Stock Adjustments</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700">Date</TableHead>
                  <TableHead className="font-bold text-slate-700">Type</TableHead>
                  <TableHead className="font-bold text-slate-700">Reference #</TableHead>
                  <TableHead className="font-bold text-slate-700">Consumable Item</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Quantity</TableHead>
                  <TableHead className="font-bold text-slate-700">Source / Destination</TableHead>
                  <TableHead className="font-bold text-slate-700">Officer</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Balance After</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-dvla-green mb-2" />
                      Loading stock movements...
                    </TableCell>
                  </TableRow>
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                      No stock movement records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((m, idx) => (
                    <TableRow key={`${m.movement_type}-${m.id}-${idx}`} className="hover:bg-slate-50/70 border-b border-slate-100">
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                        {m.movement_date ? m.movement_date.slice(0, 10) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            m.movement_type === "receipt"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 w-fit"
                              : m.movement_type === "issue"
                              ? "bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 w-fit"
                              : "bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 w-fit"
                          }
                        >
                          {m.movement_type === "receipt" && <ArrowDownLeft className="h-3 w-3" />}
                          {m.movement_type === "issue" && <ArrowUpRight className="h-3 w-3" />}
                          {m.movement_type === "adjustment" && <ArrowLeftRight className="h-3 w-3" />}
                          {m.movement_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-slate-800">
                        {m.reference}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900 text-sm">{m.item_name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{m.item_code}</div>
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-sm text-slate-900">
                        {m.movement_type === "receipt" ? `+${m.quantity}` : `-${m.quantity}`} {m.unit}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        <div>
                          {m.from_party ? <span className="text-slate-400">From: </span> : null}
                          {m.from_party}
                        </div>
                        <div>
                          {m.to_party ? <span className="text-slate-400">To: </span> : null}
                          {m.to_party}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-700">
                        {m.officer || "System"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {m.balance_after !== null ? (
                          <span className="text-base font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 inline-block shadow-xs">
                            {m.balance_after}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title={`Delete ${m.movement_type} record ${m.reference}`}
                          disabled={deletingKey === `${m.movement_type}-${m.id}`}
                          onClick={() => handleDeleteMovement(m)}
                        >
                          {deletingKey === `${m.movement_type}-${m.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

