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
  TableFooter,
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
  Calendar,
  Filter,
  ArrowRight,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
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

type DatePreset = "all" | "today" | "week" | "month" | "quarter" | "year" | "custom";

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
  const [activePreset, setActivePreset] = useState<DatePreset>("all");

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
      params.set("_t", Date.now().toString());
      const queryStr = `?${params.toString()}`;

      const [usageRes, yieldRes] = await Promise.all([
        fetch(`/api/reports/usage${queryStr}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        }),
        fetch(`/api/reports/yield${queryStr}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        }),
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

  // Handle Preset Date selection
  const handleApplyPreset = (preset: DatePreset) => {
    setActivePreset(preset);
    const now = new Date();
    const toISO = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    if (preset === "all") {
      setDateFrom("");
      setDateTo("");
      return;
    }

    if (preset === "today") {
      const today = toISO(now);
      setDateFrom(today);
      setDateTo(today);
      return;
    }

    if (preset === "week") {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      setDateFrom(toISO(monday));
      setDateTo(toISO(now));
      return;
    }

    if (preset === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(toISO(firstDay));
      setDateTo(toISO(now));
      return;
    }

    if (preset === "quarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const firstDay = new Date(now.getFullYear(), qMonth, 1);
      setDateFrom(toISO(firstDay));
      setDateTo(toISO(now));
      return;
    }

    if (preset === "year") {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      setDateFrom(toISO(firstDay));
      setDateTo(toISO(now));
      return;
    }
  };

  const handleCustomDateChange = (from: string, to: string) => {
    setActivePreset("custom");
    setDateFrom(from);
    setDateTo(to);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSelectedStation("all");
    setSelectedCategory("all");
    setDateFrom("");
    setDateTo("");
    setActivePreset("all");
  };

  // Filtered lists with null-safe accessors
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
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
  }, [batches, searchTerm, statusFilter]);

  const filteredUsage = useMemo(() => {
    return usageItems.filter((i) => {
      const search = searchTerm.toLowerCase();
      return (
        (i.name || "").toLowerCase().includes(search) ||
        (i.item_code || "").toLowerCase().includes(search) ||
        (i.category || "").toLowerCase().includes(search) ||
        (i.station || "").toLowerCase().includes(search) ||
        (i.department || "").toLowerCase().includes(search)
      );
    });
  }, [usageItems, searchTerm]);

  const lowStockItems = useMemo(() => {
    return usageItems.filter(
      (i) => i.status === "LOW STOCK" || i.status === "OUT OF STOCK"
    );
  }, [usageItems]);

  // Tab 1 Calculated Totals
  const tab1Totals = useMemo(() => {
    const totalCollected = filteredBatches.reduce((acc, b) => acc + (Number(b.quantity_issued) || 0), 0);
    const totalPrinted = filteredBatches.reduce((acc, b) => acc + (b.status === "Reconciled" ? (Number(b.printed_cards) || 0) : 0), 0);
    const totalDamaged = filteredBatches.reduce((acc, b) => acc + (b.status === "Reconciled" ? (Number(b.damaged_cards) || 0) : 0), 0);
    const totalRecapture = filteredBatches.reduce((acc, b) => acc + (b.status === "Reconciled" ? (Number(b.recapture_cards) || 0) : 0), 0);
    const netYield = totalCollected > 0 && totalPrinted > 0 ? ((totalPrinted / totalCollected) * 100).toFixed(1) : "—";
    return { totalCollected, totalPrinted, totalDamaged, totalRecapture, netYield };
  }, [filteredBatches]);

  // Tab 2 Calculated Totals
  const tab2Totals = useMemo(() => {
    const totalReceived = filteredUsage.reduce((acc, i) => acc + (Number(i.received) || 0), 0);
    const totalIssued = filteredUsage.reduce((acc, i) => acc + (Number(i.issued) || 0), 0);
    const totalBalance = filteredUsage.reduce((acc, i) => acc + (Number(i.balance) || 0), 0);
    return { totalReceived, totalIssued, totalBalance };
  }, [filteredUsage]);

  // Tab 3 Calculated Totals
  const tab3Totals = useMemo(() => {
    const totalBalance = lowStockItems.reduce((acc, i) => acc + (Number(i.balance) || 0), 0);
    const totalReorder = lowStockItems.reduce((acc, i) => acc + (Number(i.reorder_level) || 0), 0);
    const totalDeficit = lowStockItems.reduce((acc, i) => {
      const def = (Number(i.reorder_level) || 0) - (Number(i.balance) || 0);
      return acc + (def > 0 ? def : 0);
    }, 0);
    return { totalBalance, totalReorder, totalDeficit };
  }, [lowStockItems]);

  // Full Excel Export
  const handleExportExcel = () => {
    if (usageItems.length === 0 && batches.length === 0) {
      alert("No report data available to export.");
      return;
    }

    const wb = XLSX.utils.book_new();
    const dateStr = new Date().toISOString().split("T")[0];

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

    const totalsInvRow = [
      "", "", "TOTALS", "", "", "", "",
      tab2Totals.totalReceived,
      tab2Totals.totalIssued,
      tab2Totals.totalBalance,
      "", "",
    ];

    const wsInv = XLSX.utils.aoa_to_sheet([invHeaders, ...invRows, totalsInvRow]);

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

    const totalsInvRowIdx = invRows.length + 1;
    totalsInvRow.forEach((_, ci) => {
      const addr = XLSX.utils.encode_cell({ r: totalsInvRowIdx, c: ci });
      if (wsInv[addr]) wsInv[addr].s = numColsInv.includes(ci) ? numTotal : totalStyle;
    });

    wsInv["!cols"] = [
      { wch: 5 }, { wch: 14 }, { wch: 28 }, { wch: 18 },
      { wch: 18 }, { wch: 16 }, { wch: 8 },
      { wch: 13 }, { wch: 12 }, { wch: 16 },
      { wch: 18 }, { wch: 13 },
    ];
    wsInv["!rows"] = [{ hpt: 28 }, ...invRows.map(() => ({ hpt: 20 })), { hpt: 24 }];
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

    const totalsRow = [
      "", "", "", "",
      "TOTALS", "", "",
      "", "", "",
      tab1Totals.totalCollected,
      tab1Totals.totalPrinted,
      tab1Totals.totalDamaged,
      tab1Totals.totalRecapture,
      "",
      tab1Totals.netYield !== "—" ? `${tab1Totals.netYield}%` : "—",
      "", "", "", "", "",
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

    XLSX.writeFile(wb, `DVLA_Consumables_Report_${dateFrom || "Start"}_to_${dateTo || dateStr}.xlsx`);
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
        {/* Printable DVLA Header (Visible only when printing) */}
        <div className="hidden print:block pb-4 mb-4 border-b-2 border-slate-800">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">DRIVER & VEHICLE LICENSING AUTHORITY (DVLA)</h1>
              <h2 className="text-sm font-bold text-slate-700">CONSUMABLES MANAGEMENT & PRODUCTION AUDIT REPORT</h2>
              <div className="text-xs text-slate-500 mt-1 flex gap-3">
                <span><strong>Station:</strong> {selectedStation === "all" ? "All DVLA Stations" : selectedStation}</span>
                <span><strong>Category:</strong> {selectedCategory === "all" ? "All Categories" : selectedCategory}</span>
                <span><strong>Date Period:</strong> {dateFrom ? `${dateFrom} to ${dateTo || "Today"}` : "All Recorded Dates"}</span>
              </div>
            </div>
            <div className="text-right text-xs text-slate-400">
              <div>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
              <div>Confidential Management Report</div>
            </div>
          </div>
        </div>

        {/* Header and Global Actions (Hidden in Print) */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System & Production Reports</h1>
            <p className="text-sm text-slate-500">
              Audit stock usage, consumable collections, and production yield across DVLA stations.
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 print:grid-cols-3">
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

        {/* Navigation Tabs (Hidden in Print) */}
        <div className="flex border-b border-slate-200 gap-2 print:hidden">
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

        {/* COMPREHENSIVE FILTERS BAR WITH ADVANCED DATE RANGE FILTERING (Hidden in Print) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4 print:hidden">
          {/* Row 1: Search, Station, Category, and Work Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 items-end">
            {/* Search */}
            <div className="lg:col-span-4 space-y-1">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Search Records</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search item code, description, officer, batch..."
                  className="pl-9 bg-slate-50 border-slate-200 focus:bg-white text-xs h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Station Filter */}
            <div className="lg:col-span-3 space-y-1">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Station</Label>
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
            <div className="lg:col-span-3 space-y-1">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Category / Type</Label>
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

            {/* Status Filter (Work Done tab) or Reset */}
            {activeTab === "work_done" ? (
              <div className="lg:col-span-2 space-y-1">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Reconciled Status</Label>
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
              <div className="lg:col-span-2 flex items-end">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-9 w-full text-xs text-slate-600 hover:text-slate-900 border border-slate-200"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reset Filters
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Row 2: Date Range Filter Section */}
          <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Quick Date Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-dvla-green" /> Date Period:
              </span>
              {(
                [
                  { id: "all", label: "All Time" },
                  { id: "today", label: "Today" },
                  { id: "week", label: "This Week" },
                  { id: "month", label: "This Month" },
                  { id: "quarter", label: "This Quarter" },
                  { id: "year", label: "This Year" },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset.id)}
                  type="button"
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                    activePreset === preset.id && !dateFrom && !dateTo && preset.id === "all"
                      ? "bg-dvla-green text-white shadow-xs"
                      : activePreset === preset.id && preset.id !== "all"
                      ? "bg-dvla-green text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range Pickers (Start Date & End Date) */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="dateFrom" className="text-xs text-slate-500 font-medium">From:</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleCustomDateChange(e.target.value, dateTo)}
                  className="bg-slate-50 text-xs h-8.5 w-36"
                  title="Filter start date"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Label htmlFor="dateTo" className="text-xs text-slate-500 font-medium">To:</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => handleCustomDateChange(dateFrom, e.target.value)}
                  className="bg-slate-50 text-xs h-8.5 w-36"
                  title="Filter end date"
                />
              </div>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8.5 px-2.5 text-xs text-slate-600 hover:text-slate-900 border-slate-300"
                  title="Reset all filters"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Active Filter Summary Strip */}
          {(dateFrom || dateTo || selectedStation !== "all" || selectedCategory !== "all") && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Active Scope:</span>
              {dateFrom || dateTo ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-mono text-[10px]">
                  Period: {dateFrom || "Earliest"} → {dateTo || "Latest"}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]">
                  Period: All Dates
                </Badge>
              )}
              {selectedStation !== "all" && (
                <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[10px]">
                  Station: {selectedStation}
                </Badge>
              )}
              {selectedCategory !== "all" && (
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">
                  Category: {selectedCategory}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* TAB 1: Collected Consumables & Work Done Table (NO ACTION COLUMN) */}
        {activeTab === "work_done" && (
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-dvla-green" />
                  Consumable Collections & Returned Work Done Report
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Production report showing collected batches, work completed (cards printed), damaged spoilage, and net yield rates.
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
                    <TableRow className="bg-slate-50/70 border-b border-slate-200">
                      <TableHead className="w-10 font-bold text-slate-700 text-center">#</TableHead>
                      <TableHead className="font-bold text-slate-700">Date Issued</TableHead>
                      <TableHead className="font-bold text-slate-700">Batch Code</TableHead>
                      <TableHead className="font-bold text-slate-700">Consumable Item</TableHead>
                      <TableHead className="font-bold text-slate-700">Category</TableHead>
                      <TableHead className="font-bold text-slate-700">Station / Dept</TableHead>
                      <TableHead className="font-bold text-slate-700">Collected By</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Qty Collected</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Work Done (Printed)</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Damaged</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Recaptured</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Yield %</TableHead>
                      <TableHead className="text-center font-bold text-slate-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center py-10 text-slate-500">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-dvla-green mb-2" />
                          Loading work reconciliation report data...
                        </TableCell>
                      </TableRow>
                    ) : filteredBatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center py-10 text-slate-500">
                          No collected consumable records match your selected date range or filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBatches.map((b, idx) => (
                        <TableRow key={b.id} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
                          <TableCell className="text-center font-mono text-xs text-slate-400">
                            {idx + 1}
                          </TableCell>
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
                            <div className="text-[11px] font-mono text-slate-500">{b.item_code}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-slate-50 font-medium text-[11px] text-slate-600">
                              {b.category_name || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-700">
                            <div className="font-medium">{b.station_name || "Head Office"}</div>
                            {b.department_name && <div className="text-slate-400 text-[11px]">{b.department_name}</div>}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-slate-800">
                            {b.issued_to}
                          </TableCell>
                          <TableCell className="text-right font-extrabold text-slate-900 text-sm whitespace-nowrap">
                            {(Number(b.quantity_issued) || 0).toLocaleString()}{" "}
                            <span className="text-xs font-normal text-slate-400">{b.unit}</span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-700 text-sm whitespace-nowrap">
                            {b.status === "Reconciled" ? (
                              `${(Number(b.printed_cards) || 0).toLocaleString()} ${b.unit}`
                            ) : (
                              <span className="text-slate-400 font-normal italic">Pending</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm whitespace-nowrap">
                            {b.status === "Reconciled" ? (
                              <span className={(Number(b.damaged_cards) || 0) > 0 ? "font-bold text-red-600" : "text-slate-400"}>
                                {(Number(b.damaged_cards) || 0).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm text-slate-600 whitespace-nowrap">
                            {b.status === "Reconciled" ? (
                              (Number(b.recapture_cards) || 0).toLocaleString()
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
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                b.status === "Reconciled"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold"
                                  : "bg-amber-50 text-amber-800 border-amber-200 font-semibold flex items-center gap-1 mx-auto w-fit"
                              }
                            >
                              {b.status === "Pending" ? <Clock className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                              {b.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  {/* Table Summary Footer */}
                  {filteredBatches.length > 0 && (
                    <TableFooter className="bg-slate-100/80 border-t-2 border-slate-300 font-bold">
                      <TableRow>
                        <TableCell colSpan={7} className="text-slate-800 text-xs uppercase tracking-wider font-extrabold">
                          Total Period Summary ({filteredBatches.length} batches)
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-900 text-sm">
                          {tab1Totals.totalCollected.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-black text-emerald-800 text-sm">
                          {tab1Totals.totalPrinted.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-black text-red-600 text-sm">
                          {tab1Totals.totalDamaged.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-700 text-sm">
                          {tab1Totals.totalRecapture.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-black text-dvla-green text-sm">
                          {tab1Totals.netYield !== "—" ? `${tab1Totals.netYield}%` : "—"}
                        </TableCell>
                        <TableCell className="text-center text-xs text-slate-500 font-normal">
                          {filteredBatches.filter((b) => b.status === "Reconciled").length} Reconciled
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 2: Stock & Inventory Balances Table */}
        {activeTab === "inventory" && (
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-dvla-green" />
                  Consumable Stock Usage & Balances Report
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consolidated inventory register displaying intake receipts, issues for the period, and current balance on hand.
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
                    <TableRow className="bg-slate-50/70 border-b border-slate-200">
                      <TableHead className="w-10 font-bold text-slate-700 text-center">#</TableHead>
                      <TableHead className="font-bold text-slate-700">Code</TableHead>
                      <TableHead className="font-bold text-slate-700">Item Name</TableHead>
                      <TableHead className="font-bold text-slate-700">Category</TableHead>
                      <TableHead className="font-bold text-slate-700">Station / Dept</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Received (Period)</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Issued (Period)</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Current Balance</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Reorder Threshold</TableHead>
                      <TableHead className="text-center font-bold text-slate-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-10 text-slate-500">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-dvla-green mb-2" />
                          Loading inventory balances...
                        </TableCell>
                      </TableRow>
                    ) : filteredUsage.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-10 text-slate-500">
                          No inventory records match your criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsage.map((item, idx) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
                          <TableCell className="text-center font-mono text-xs text-slate-400">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold text-slate-700">
                            {item.item_code}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-900">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-slate-50 font-medium text-[11px] text-slate-600">
                              {item.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs">
                            <div>{item.station || "Head Office"}</div>
                            {item.department && <div className="text-slate-400 text-[11px]">{item.department}</div>}
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-700">
                            {(Number(item.received) || 0).toLocaleString()} <span className="text-[10px] text-slate-400">{item.unit}</span>
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-700">
                            {(Number(item.issued) || 0).toLocaleString()} <span className="text-[10px] text-slate-400">{item.unit}</span>
                          </TableCell>
                          <TableCell className="text-right font-black text-slate-900 text-base">
                            {(Number(item.balance) || 0).toLocaleString()}{" "}
                            <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-500 text-sm">
                            {(Number(item.reorder_level) || 0).toLocaleString()} {item.unit}
                          </TableCell>
                          <TableCell className="text-center">
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
                  {/* Table Summary Footer */}
                  {filteredUsage.length > 0 && (
                    <TableFooter className="bg-slate-100/80 border-t-2 border-slate-300 font-bold">
                      <TableRow>
                        <TableCell colSpan={5} className="text-slate-800 text-xs uppercase tracking-wider font-extrabold">
                          Total Period Stock Metrics ({filteredUsage.length} items)
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-900 text-sm">
                          {tab2Totals.totalReceived.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-900 text-sm">
                          {tab2Totals.totalIssued.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-black text-emerald-800 text-base">
                          {tab2Totals.totalBalance.toLocaleString()}
                        </TableCell>
                        <TableCell colSpan={2} className="text-center text-xs text-slate-500 font-normal">
                          Inventory Healthy
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: Low Stock Alerts Table */}
        {activeTab === "low_stock" && (
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="bg-amber-50/60 border-b border-amber-200 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Critical & Low Stock Items Needing Reorder
                </CardTitle>
                <p className="text-xs text-amber-700 mt-0.5">
                  Consumables currently below their configured safety reorder thresholds. Immediate procurement action recommended.
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
                    <TableRow className="bg-slate-50/70 border-b border-slate-200">
                      <TableHead className="w-10 font-bold text-slate-700 text-center">#</TableHead>
                      <TableHead className="font-bold text-slate-700">Code & Item</TableHead>
                      <TableHead className="font-bold text-slate-700">Category</TableHead>
                      <TableHead className="font-bold text-slate-700">Location / Station</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Current Balance</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Reorder Threshold</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Deficit / Shortfall</TableHead>
                      <TableHead className="text-center font-bold text-slate-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                          All consumables are currently at healthy inventory levels! No low stock alerts.
                        </TableCell>
                      </TableRow>
                    ) : (
                      lowStockItems.map((item, idx) => {
                        const deficit = (Number(item.reorder_level) || 0) - (Number(item.balance) || 0);
                        return (
                          <TableRow key={item.id} className="hover:bg-slate-50 border-b border-slate-100">
                            <TableCell className="text-center font-mono text-xs text-slate-400">
                              {idx + 1}
                            </TableCell>
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
                            <TableCell className="text-right font-bold text-amber-700">
                              {deficit > 0 ? `-${deficit.toLocaleString()} ${item.unit}` : "0"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="destructive" className="bg-red-600 text-white font-bold">
                                {item.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                  {/* Table Summary Footer */}
                  {lowStockItems.length > 0 && (
                    <TableFooter className="bg-red-50/80 border-t-2 border-red-200 font-bold">
                      <TableRow>
                        <TableCell colSpan={4} className="text-red-900 text-xs uppercase tracking-wider font-extrabold">
                          Total Procurement Reorder Deficit ({lowStockItems.length} items flagged)
                        </TableCell>
                        <TableCell className="text-right font-black text-red-700 text-base">
                          {tab3Totals.totalBalance.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-700 text-sm">
                          {tab3Totals.totalReorder.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-black text-red-700 text-base">
                          {tab3Totals.totalDeficit > 0 ? `-${tab3Totals.totalDeficit.toLocaleString()}` : "0"}
                        </TableCell>
                        <TableCell className="text-center text-xs text-red-600 font-semibold">
                          Action Required
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
