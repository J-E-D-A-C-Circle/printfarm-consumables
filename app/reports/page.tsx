"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Printer,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
  CheckSquare,
  Layers,
  BarChart3,
  TrendingUp,
  Package,
  RotateCcw,
  X
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx-js-style";

interface UsageItem {
  id: number;
  item_code: string;
  name: string;
  category: string;
  station: string | null;
  department: string | null;
  unit: string;
  received: number;
  issued: number;
  balance: number;
  reorder_level: number;
  status: string;
}

interface BatchItem {
  id: number;
  batch_code: string;
  date_issued: string;
  issued_to: string;
  quantity_issued: number;
  status: "Pending" | "Reconciled" | "Voided";
  printed_cards: number;
  damaged_cards: number;
  recapture_cards: number;
  unaccounted: number;
  yield_percentage: number | null;
  waste_percentage: number | null;
  reconciled_at: string | null;
  date_of_reconciliation: string | null;
  reason_for_damage: string | null;
  notes: string | null;
  item_name: string;
  item_code: string;
  unit: string;
  category_name?: string;
  issue_reference?: string;
  station_name?: string;
  department_name?: string;
  reconciled_by_name?: string;
}

interface UsageSummary {
  total_items: number;
  total_balance: number;
  total_received: number;
  total_issued: number;
  low_stock: number;
  out_of_stock: number;
}

interface YieldSummary {
  total_batches: number;
  pending_batches: number;
  reconciled_batches: number;
  total_issued: number;
  total_printed: number;
  total_damaged: number;
  total_recapture: number;
  total_unaccounted: number;
  avg_yield: number;
  avg_waste: number;
}

interface StationOption {
  id: number;
  name: string;
}

interface CategoryOption {
  id: number;
  name: string;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"work_done" | "inventory" | "low_stock">("work_done");
  const [usageItems, setUsageItems] = useState<UsageItem[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [yieldSummary, setYieldSummary] = useState<YieldSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter options
  const [stations, setStations] = useState<StationOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  // Active Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStation, setSelectedStation] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Reconcile modal state
  const [reconcilingBatch, setReconcilingBatch] = useState<BatchItem | null>(null);
  const [printedCards, setPrintedCards] = useState("");
  const [damagedCards, setDamagedCards] = useState("");
  const [recaptureCards, setRecaptureCards] = useState("");
  const [returnedToStock, setReturnedToStock] = useState("");
  const [damageReason, setDamageReason] = useState("");
  const [notes, setNotes] = useState("");
  const [reconcileSubmitting, setReconcileSubmitting] = useState(false);
  const [reconcileMsg, setReconcileMsg] = useState<string | null>(null);

  // Load dropdown options for filters
  useEffect(() => {
    async function loadOptions() {
      try {
        const [stRes, catRes] = await Promise.all([
          fetch("/api/stations"),
          fetch("/api/categories"),
        ]);
        if (stRes.ok) {
          const d = await stRes.json();
          setStations(d.data || []);
        }
        if (catRes.ok) {
          const d = await catRes.json();
          setCategories(d.data || []);
        }
      } catch (err) {
        console.error("Failed to load station/category filter options:", err);
      }
    }
    loadOptions();
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStation && selectedStation !== "all") params.set("station", selectedStation);
      if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const queryStr = params.toString() ? `?${params.toString()}` : "";

      const [usageRes, yieldRes] = await Promise.all([
        fetch(`/api/reports/usage${queryStr}`),
        fetch(`/api/reports/yield${queryStr}`),
      ]);

      if (usageRes.ok) {
        const u = await usageRes.json();
        setUsageItems(u.data || []);
        if (u.summary) setUsageSummary(u.summary);
      }
      if (yieldRes.ok) {
        const y = await yieldRes.json();
        setBatches(y.data || []);
        if (y.summary) setYieldSummary(y.summary);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedStation, selectedCategory, dateFrom, dateTo]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSelectedStation("all");
    setSelectedCategory("all");
    setDateFrom("");
    setDateTo("");
  };

  // Open reconciliation modal
  const openReconcile = (batch: BatchItem) => {
    setReconcilingBatch(batch);
    setPrintedCards(batch.printed_cards ? String(batch.printed_cards) : "");
    setDamagedCards(batch.damaged_cards ? String(batch.damaged_cards) : "");
    setRecaptureCards(batch.recapture_cards ? String(batch.recapture_cards) : "");
    setReturnedToStock("");
    setDamageReason(batch.reason_for_damage || "");
    setNotes(batch.notes || "");
    setReconcileMsg(null);
  };

  const handleSaveReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcilingBatch) return;

    setReconcileSubmitting(true);
    try {
      const res = await fetch(`/api/batches/${reconcilingBatch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          printed_cards: parseInt(printedCards) || 0,
          damaged_cards: parseInt(damagedCards) || 0,
          recapture_cards: parseInt(recaptureCards) || 0,
          returned_to_stock: parseInt(returnedToStock) || 0,
          reason_for_damage: damageReason.trim() || undefined,
          notes: notes.trim() || undefined,
          date_of_reconciliation: new Date().toISOString().split("T")[0],
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save reconciliation.");
      }

      setReconcileMsg("Work done successfully recorded and batch reconciled!");
      setTimeout(() => {
        setReconcilingBatch(null);
        fetchReports();
      }, 1200);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error reconciling batch.");
    } finally {
      setReconcileSubmitting(false);
    }
  };

  // Filtered lists with null-safe accessors
  const filteredBatches = batches.filter((b) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      (b.item_name || "").toLowerCase().includes(search) ||
      (b.batch_code || "").toLowerCase().includes(search) ||
      (b.issued_to || "").toLowerCase().includes(search) ||
      (b.station_name || "").toLowerCase().includes(search) ||
      (b.issue_reference || "").toLowerCase().includes(search);
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredUsage = usageItems.filter((i) => {
    const search = searchTerm.toLowerCase();
    return (
      (i.name || "").toLowerCase().includes(search) ||
      (i.item_code || "").toLowerCase().includes(search) ||
      (i.category || "").toLowerCase().includes(search) ||
      (i.station || "").toLowerCase().includes(search) ||
      (i.department || "").toLowerCase().includes(search)
    );
  });

  const lowStockItems = usageItems.filter(
    (i) => i.status === "LOW STOCK" || i.status === "OUT OF STOCK"
  );

  // Full Excel Export
  const handleExportExcel = () => {
    if (usageItems.length === 0 && batches.length === 0) {
      alert("No report data available to export.");
      return;
    }

    const wb = XLSX.utils.book_new();
    const dateStr = new Date().toISOString().split("T")[0];

    // Helper: apply header style
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
      fill: { fgColor: { rgb: "1B5E20" }, patternType: "solid" },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } },
      },
    };
    const rowStyle = {
      font: { sz: 10 },
      alignment: { vertical: "center", wrapText: false },
      border: {
        top: { style: "hair", color: { rgb: "E0E0E0" } },
        bottom: { style: "hair", color: { rgb: "E0E0E0" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } },
      },
    };
    const altRowStyle = {
      ...rowStyle,
      fill: { fgColor: { rgb: "F1F8E9" }, patternType: "solid" },
    };
    const totalStyle = {
      font: { bold: true, sz: 11, color: { rgb: "1B5E20" } },
      fill: { fgColor: { rgb: "E8F5E9" }, patternType: "solid" },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "medium", color: { rgb: "1B5E20" } },
        bottom: { style: "medium", color: { rgb: "1B5E20" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } },
      },
    };
    const numStyle = { ...rowStyle, alignment: { horizontal: "center", vertical: "center" } };
    const numStyleAlt = { ...altRowStyle, alignment: { horizontal: "center", vertical: "center" } };
    const numTotal = { ...totalStyle, alignment: { horizontal: "center", vertical: "center" } };

    // SHEET 1: Stock & Inventory Balances
    const invHeaders = [
      "No.", "Item Code", "Consumable Name", "Category",
      "Station", "Department", "Unit",
      "Received Qty", "Issued Qty", "Current Balance",
      "Reorder Threshold", "Status",
    ];

    const invRows = filteredUsage.map((item, idx) => [
      idx + 1,
      item.item_code,
      item.name,
      item.category,
      item.station || "Head Office",
      item.department || "—",
      item.unit,
      Number(item.received) || 0,
      Number(item.issued) || 0,
      Number(item.balance) || 0,
      Number(item.reorder_level) || 0,
      item.status,
    ]);

    const wsInv = XLSX.utils.aoa_to_sheet([invHeaders, ...invRows]);

    invHeaders.forEach((_, ci) => {
      const addr = XLSX.utils.encode_cell({ r: 0, c: ci });
      if (wsInv[addr]) wsInv[addr].s = headerStyle;
    });
    const numColsInv = [7, 8, 9, 10];
    invRows.forEach((row, ri) => {
      const style = ri % 2 === 0 ? rowStyle : altRowStyle;
      row.forEach((_, ci) => {
        const addr = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
        if (wsInv[addr]) wsInv[addr].s = numColsInv.includes(ci) ? (ri % 2 === 0 ? numStyle : numStyleAlt) : style;
      });
    });

    wsInv["!cols"] = [
      { wch: 5 }, { wch: 14 }, { wch: 28 }, { wch: 18 },
      { wch: 18 }, { wch: 16 }, { wch: 8 },
      { wch: 13 }, { wch: 12 }, { wch: 16 },
      { wch: 18 }, { wch: 13 },
    ];
    wsInv["!rows"] = [{ hpt: 28 }, ...invRows.map(() => ({ hpt: 20 }))];
    XLSX.utils.book_append_sheet(wb, wsInv, "Stock & Inventory");

    // SHEET 2: Collected Consumables & Work Done
    const wdHeaders = [
      "No.", "Date Collected", "Batch / Ref Code", "Issue Reference",
      "Consumable Item", "Item Code", "Category",
      "Collected By (Officer)", "Station", "Department",
      "Qty Collected", "Work Done (Produced)", "Damaged / Waste",
      "Recaptured", "Unaccounted",
      "Yield %", "Waste %",
      "Status", "Date Reconciled", "Reconciled By",
      "Notes / Damage Reason",
    ];

    const wdRows = filteredBatches.map((b, idx) => [
      idx + 1,
      b.date_issued,
      b.batch_code,
      b.issue_reference || "—",
      b.item_name,
      b.item_code,
      b.category_name || "—",
      b.issued_to,
      b.station_name || "Head Office",
      b.department_name || "—",
      Number(b.quantity_issued) || 0,
      b.status === "Reconciled" ? (Number(b.printed_cards) || 0) : "Pending",
      b.status === "Reconciled" ? (Number(b.damaged_cards) || 0) : "Pending",
      b.status === "Reconciled" ? (Number(b.recapture_cards) || 0) : "Pending",
      b.status === "Reconciled" ? (Number(b.unaccounted) || 0) : "Pending",
      b.yield_percentage !== null ? `${b.yield_percentage}%` : "Pending",
      b.waste_percentage !== null ? `${b.waste_percentage}%` : "Pending",
      b.status,
      b.date_of_reconciliation || "Pending",
      b.reconciled_by_name || "—",
      [b.reason_for_damage, b.notes].filter(Boolean).join(" | ") || "—",
    ]);

    const reconciledOnly = filteredBatches.filter((b) => b.status === "Reconciled");
    const totalsRow = [
      "", "", "", "",
      "TOTALS", "", "",
      "", "", "",
      filteredBatches.reduce((s, b) => s + (Number(b.quantity_issued) || 0), 0),
      reconciledOnly.reduce((s, b) => s + (Number(b.printed_cards) || 0), 0),
      reconciledOnly.reduce((s, b) => s + (Number(b.damaged_cards) || 0), 0),
      reconciledOnly.reduce((s, b) => s + (Number(b.recapture_cards) || 0), 0),
      reconciledOnly.reduce((s, b) => s + (Number(b.unaccounted) || 0), 0),
      "", "", "", "", "", "",
    ];

    const wsWd = XLSX.utils.aoa_to_sheet([wdHeaders, ...wdRows, totalsRow]);

    wdHeaders.forEach((_, ci) => {
      const addr = XLSX.utils.encode_cell({ r: 0, c: ci });
      if (wsWd[addr]) wsWd[addr].s = headerStyle;
    });
    const numColsWd = [10, 11, 12, 13, 14];
    wdRows.forEach((row, ri) => {
      const even = ri % 2 === 0;
      row.forEach((_, ci) => {
        const addr = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
        if (wsWd[addr]) wsWd[addr].s = numColsWd.includes(ci)
          ? (even ? numStyle : numStyleAlt)
          : (even ? rowStyle : altRowStyle);
      });
    });
    const totalsRowIdx = wdRows.length + 1;
    totalsRow.forEach((_, ci) => {
      const addr = XLSX.utils.encode_cell({ r: totalsRowIdx, c: ci });
      if (wsWd[addr]) wsWd[addr].s = numColsWd.includes(ci) ? numTotal : totalStyle;
    });

    wsWd["!cols"] = [
      { wch: 5 }, { wch: 14 }, { wch: 18 }, { wch: 16 },
      { wch: 26 }, { wch: 13 }, { wch: 16 },
      { wch: 22 }, { wch: 18 }, { wch: 16 },
      { wch: 14 }, { wch: 20 }, { wch: 16 },
      { wch: 13 }, { wch: 14 },
      { wch: 10 }, { wch: 10 },
      { wch: 14 }, { wch: 16 }, { wch: 18 },
      { wch: 36 },
    ];
    wsWd["!rows"] = [{ hpt: 28 }, ...wdRows.map(() => ({ hpt: 20 })), { hpt: 24 }];
    XLSX.utils.book_append_sheet(wb, wsWd, "Collected & Work Done");

    XLSX.writeFile(wb, `DVLA_Consumables_Report_${dateStr}.xlsx`);
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    statusFilter !== "all" ||
    selectedStation !== "all" ||
    selectedCategory !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header and Global Actions */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System & Production Reports</h1>
            <p className="text-sm text-slate-500">
              Track stock levels, consumable collections, and reconciliation of returned work done across DVLA stations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="gap-2 border-slate-300 text-slate-700 h-9"
            >
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
            <Button
              onClick={handleExportExcel}
              className="bg-dvla-green hover:bg-dvla-green-light text-white gap-2 font-semibold shadow-sm h-9"
            >
              <FileSpreadsheet className="h-4 w-4 text-dvla-gold" />
              Export Excel (.xlsx)
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchReports}
              title="Refresh Report Data"
              className="h-9 w-9 text-slate-600"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Overview Summary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Items */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Consumables</span>
                <Package className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-2xl font-black text-slate-900">
                {usageSummary ? usageSummary.total_items : usageItems.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Active catalog items</p>
            </CardContent>
          </Card>

          {/* Current Stock Balance */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Total In Stock</span>
                <Layers className="h-4 w-4 text-dvla-green" />
              </div>
              <p className="text-2xl font-black text-slate-900">
                {usageSummary
                  ? Number(usageSummary.total_balance).toLocaleString()
                  : usageItems.reduce((acc, i) => acc + (Number(i.balance) || 0), 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Available units</p>
            </CardContent>
          </Card>

          {/* Batches Tracked */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Batches Issued</span>
                <CheckSquare className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">
                {yieldSummary ? yieldSummary.total_batches : batches.length}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                <span className="text-emerald-700 font-semibold">
                  {yieldSummary ? yieldSummary.reconciled_batches : batches.filter((b) => b.status === "Reconciled").length} Reconciled
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Cards Produced / Work Done */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Work Done</span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-700">
                {yieldSummary
                  ? Number(yieldSummary.total_printed).toLocaleString()
                  : batches
                      .filter((b) => b.status === "Reconciled")
                      .reduce((s, b) => s + (Number(b.printed_cards) || 0), 0)
                      .toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Printed / produced</p>
            </CardContent>
          </Card>

          {/* Average Yield */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Avg Yield Rate</span>
                <BarChart3 className="h-4 w-4 text-dvla-gold" />
              </div>
              <p className="text-2xl font-black text-slate-900">
                {yieldSummary && yieldSummary.avg_yield ? `${yieldSummary.avg_yield}%` : "—"}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Spoilage: {yieldSummary ? `${yieldSummary.avg_waste}%` : "0%"}
              </p>
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Low Stock</span>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <p className={`text-2xl font-black ${lowStockItems.length > 0 ? "text-red-600" : "text-emerald-700"}`}>
                {usageSummary ? usageSummary.low_stock + usageSummary.out_of_stock : lowStockItems.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lowStockItems.length > 0 ? "Needs replenishment" : "Inventory healthy"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab("work_done")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "work_done"
                ? "border-dvla-green text-dvla-green"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            Collected Consumables & Work Done ({filteredBatches.length})
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "inventory"
                ? "border-dvla-green text-dvla-green"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="h-4 w-4" />
            Stock & Inventory Balances ({filteredUsage.length})
          </button>
          <button
            onClick={() => setActiveTab("low_stock")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "low_stock"
                ? "border-red-600 text-red-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Low Stock Alerts ({lowStockItems.length})
          </button>
        </div>

        {/* Comprehensive Filters Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search items, codes, officers, stations..."
                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white text-xs h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Station Filter */}
            <div>
              <Select value={selectedStation} onValueChange={setSelectedStation}>
                <SelectTrigger className="bg-slate-50 text-xs h-9">
                  <SelectValue placeholder="All Stations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  {stations.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-slate-50 text-xs h-9">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter (Active for Work Done tab) */}
            {activeTab === "work_done" ? (
              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-50 text-xs h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending Reconciliation</SelectItem>
                    <SelectItem value="Reconciled">Reconciled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-slate-50 text-xs h-9"
                  title="Date From"
                />
              </div>
            )}

            {/* Date To / Clear */}
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-slate-50 text-xs h-9 flex-1"
                title="Date To"
              />
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-9 px-2 text-xs text-slate-500 hover:text-slate-800"
                  title="Clear all filters"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* TAB 1: Collected Consumables & Work Done */}
        {activeTab === "work_done" && (
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-dvla-green" />
                  Consumable Collections & Returned Work Done
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed breakdown of consumables collected, production output, spoilage, and net yield.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Showing {filteredBatches.length} of {batches.length} batches
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="font-bold text-slate-700">Date</TableHead>
                      <TableHead className="font-bold text-slate-700">Batch Code</TableHead>
                      <TableHead className="font-bold text-slate-700">Consumable Collected</TableHead>
                      <TableHead className="font-bold text-slate-700">Collected By</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Qty Collected</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Work Done (Printed)</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Damaged</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Yield %</TableHead>
                      <TableHead className="font-bold text-slate-700">Status</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-10 text-slate-500">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-dvla-green mb-2" />
                          Loading work reconciliation data...
                        </TableCell>
                      </TableRow>
                    ) : filteredBatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-10 text-slate-500">
                          No collected consumable batches match your search or filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBatches.map((b) => (
                        <TableRow key={b.id} className="hover:bg-slate-50/70 border-b border-slate-100">
                          <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                            {b.date_issued}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {b.batch_code}
                            </span>
                            {b.issue_reference && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{b.issue_reference}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-slate-900 text-sm">{b.item_name}</div>
                            <div className="text-[11px] text-slate-500">{b.category_name || b.item_code}</div>
                          </TableCell>
                          <TableCell className="text-sm font-medium text-slate-800">
                            <div>{b.issued_to}</div>
                            {b.station_name && <div className="text-[11px] text-slate-400">{b.station_name}</div>}
                          </TableCell>
                          <TableCell className="text-right font-extrabold text-slate-900 text-sm">
                            {(Number(b.quantity_issued) || 0).toLocaleString()}{" "}
                            <span className="text-xs font-normal text-slate-400">{b.unit}</span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-700 text-sm">
                            {b.status === "Reconciled" ? (
                              `${(Number(b.printed_cards) || 0).toLocaleString()} ${b.unit}`
                            ) : (
                              <span className="text-slate-400 font-normal italic">Pending work</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {b.status === "Reconciled" ? (
                              <span className={(Number(b.damaged_cards) || 0) > 0 ? "font-bold text-red-600" : "text-slate-400"}>
                                {(Number(b.damaged_cards) || 0).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm font-bold">
                            {b.status === "Reconciled" && b.yield_percentage !== null ? (
                              <span
                                className={
                                  b.yield_percentage >= 95
                                    ? "text-emerald-700 font-bold"
                                    : b.yield_percentage >= 85
                                    ? "text-amber-600 font-bold"
                                    : "text-red-600 font-bold"
                                }
                              >
                                {b.yield_percentage}%
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                b.status === "Reconciled"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold"
                                  : "bg-amber-50 text-amber-800 border-amber-200 font-semibold flex items-center gap-1 w-fit"
                              }
                            >
                              {b.status === "Pending" ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                              {b.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant={b.status === "Pending" ? "default" : "outline"}
                              className={
                                b.status === "Pending"
                                  ? "bg-dvla-green hover:bg-dvla-green-light text-white text-xs font-semibold h-8"
                                  : "text-xs text-slate-600 hover:text-slate-900 h-8"
                              }
                              onClick={() => openReconcile(b)}
                            >
                              {b.status === "Pending" ? "Record Work Done" : "View / Edit"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 2: Stock & Inventory Balances */}
        {activeTab === "inventory" && (
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-dvla-green" />
                  Consumable Stock Usage & Balances
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed view of consumable inventory, total receipts, issuances, and balance on hand.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Showing {filteredUsage.length} of {usageItems.length} consumables
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="font-bold text-slate-700">Code</TableHead>
                      <TableHead className="font-bold text-slate-700">Item Name</TableHead>
                      <TableHead className="font-bold text-slate-700">Category</TableHead>
                      <TableHead className="font-bold text-slate-700">Station</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Received</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Issued</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Current Balance</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Reorder Threshold</TableHead>
                      <TableHead className="font-bold text-slate-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-dvla-green mb-2" />
                          Loading inventory balances...
                        </TableCell>
                      </TableRow>
                    ) : filteredUsage.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                          No inventory records match your criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsage.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/70 border-b border-slate-100">
                          <TableCell className="font-mono text-xs font-semibold text-slate-700">
                            {item.item_code}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-900">{item.name}</TableCell>
                          <TableCell className="text-slate-600 text-xs">{item.category}</TableCell>
                          <TableCell className="text-slate-600 text-xs">{item.station || "Head Office"}</TableCell>
                          <TableCell className="text-right font-medium text-slate-700">
                            {(Number(item.received) || 0).toLocaleString()} {item.unit}
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-700">
                            {(Number(item.issued) || 0).toLocaleString()} {item.unit}
                          </TableCell>
                          <TableCell className="text-right font-extrabold text-slate-900 text-base">
                            {(Number(item.balance) || 0).toLocaleString()} {item.unit}
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-500 text-sm">
                            {(Number(item.reorder_level) || 0).toLocaleString()} {item.unit}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                item.status === "IN STOCK"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : item.status === "LOW STOCK"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: Low Stock Alerts */}
        {activeTab === "low_stock" && (
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="bg-amber-50/60 border-b border-amber-200 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Critical & Low Stock Items Needing Reorder
                </CardTitle>
                <p className="text-xs text-amber-700 mt-0.5">
                  Consumables that have fallen below their configured safety reorder thresholds.
                </p>
              </div>
              <span className="text-xs font-bold text-amber-800">
                {lowStockItems.length} items flagged
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="font-bold text-slate-700">Item</TableHead>
                      <TableHead className="font-bold text-slate-700">Category</TableHead>
                      <TableHead className="font-bold text-slate-700">Location</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Current Balance</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Reorder Threshold</TableHead>
                      <TableHead className="font-bold text-slate-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                          All consumables are currently at healthy inventory levels! No low stock alerts.
                        </TableCell>
                      </TableRow>
                    ) : (
                      lowStockItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50 border-b border-slate-100">
                          <TableCell>
                            <div className="font-semibold text-slate-900">{item.name}</div>
                            <div className="text-[11px] font-mono text-slate-500">{item.item_code}</div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">{item.category}</TableCell>
                          <TableCell className="text-xs text-slate-600">{item.station || "Head Office"}</TableCell>
                          <TableCell className="text-right font-extrabold text-red-600 text-base">
                            {(Number(item.balance) || 0).toLocaleString()} {item.unit}
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-600">
                            {(Number(item.reorder_level) || 0).toLocaleString()} {item.unit}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive" className="bg-red-600 text-white font-bold">
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RECONCILIATION MODAL (Record Returned Work Done) */}
        {reconcilingBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-dvla-green uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {reconcilingBatch.batch_code}
                    </span>
                    <Badge variant="outline">{reconcilingBatch.status}</Badge>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    Record Work Done for {reconcilingBatch.item_name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Collected by <strong className="text-slate-700">{reconcilingBatch.issued_to}</strong> on {reconcilingBatch.date_issued}
                  </p>
                </div>
                <button
                  onClick={() => setReconcilingBatch(null)}
                  className="text-slate-400 hover:text-slate-700 text-xl font-bold"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {reconcileMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span>{reconcileMsg}</span>
                </div>
              )}

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium uppercase">Total Collected</span>
                  <p className="text-xl font-extrabold text-slate-900">{reconcilingBatch.quantity_issued}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium uppercase">Expected Units</span>
                  <p className="text-xl font-extrabold text-blue-700">{reconcilingBatch.quantity_issued}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium uppercase">Unit Type</span>
                  <p className="text-xl font-extrabold text-slate-700">{reconcilingBatch.unit}</p>
                </div>
              </div>

              <form onSubmit={handleSaveReconcile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Cards Printed / Successful Output */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Work Completed / Cards Printed <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max={reconcilingBatch.quantity_issued}
                      placeholder="e.g. 480"
                      value={printedCards}
                      onChange={(e) => setPrintedCards(e.target.value)}
                      required
                      className="font-bold text-emerald-700"
                    />
                  </div>

                  {/* Damaged Cards / Spoilage */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Damaged / Defective Output
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={damagedCards}
                      onChange={(e) => setDamagedCards(e.target.value)}
                      className="font-bold text-red-600"
                    />
                  </div>

                  {/* Recaptured Cards */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Recaptured / Reprocessed
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={recaptureCards}
                      onChange={(e) => setRecaptureCards(e.target.value)}
                    />
                  </div>

                  {/* Returned to Stock (Unused) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Unused Returned to Stock
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={returnedToStock}
                      onChange={(e) => setReturnedToStock(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400">Credited back to inventory balance.</p>
                  </div>

                  {/* Damage Reason */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Reason for Damage / Defect (If Any)
                    </Label>
                    <Input
                      placeholder="e.g. Printer feeder jam, lamination defect, barcode misprint"
                      value={damageReason}
                      onChange={(e) => setDamageReason(e.target.value)}
                    />
                  </div>

                  {/* General Work Notes */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Work Completion Notes & Remarks
                    </Label>
                    <Input
                      placeholder="e.g. License numbers GHA-001 to GHA-480 printed successfully"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setReconcilingBatch(null)}
                    disabled={reconcileSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={reconcileSubmitting}
                    className="bg-dvla-green hover:bg-dvla-green-light text-white font-semibold"
                  >
                    {reconcileSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Reconciliation...
                      </>
                    ) : (
                      "Save & Reconcile Work Done"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
