"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Printer,
  Search,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
  CheckSquare,
  Layers,
  TrendingUp,
  Package,
  RotateCcw,
  BarChart3,
  PieChart,
  Users,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import * as XLSX from "xlsx-js-style";
import { ReturnSheetRecord } from "@/components/ReconciliationModal";

type DatePreset = "all" | "today" | "week" | "month" | "quarter" | "year" | "custom";

const CHART_COLORS = [
  "#004D2C",
  "#2563EB",
  "#D97706",
  "#7C3AED",
  "#0D9488",
  "#475569",
];

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatShortDate(dateStr?: string | null) {
  if (!dateStr) return "";
  const clean = dateStr.slice(0, 10);
  const parts = clean.split("-");
  if (parts.length !== 3) return clean;
  return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
}

function formatMonthBucketLabel(ym: string) {
  const parts = ym.split("-");
  if (parts.length < 2) return ym;
  const yr = parts[0].slice(2);
  const mIdx = parseInt(parts[1], 10) - 1;
  return `${MONTH_NAMES[mIdx] || parts[1]} '${yr}`;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"return_sheet" | "type_summary" | "personnel">("return_sheet");
  const [trendMode, setTrendMode] = useState<"consumption" | "quantities">("consumption");
  const [rightChartMode, setRightChartMode] = useState<"types" | "distribution" | "officers">("types");
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);

  const [records, setRecords] = useState<ReturnSheetRecord[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activePreset, setActivePreset] = useState<DatePreset>("all");

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setCategories(d.data || []))
      .catch(() => {});
  }, []);

  const fetchReports = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      params.set("_t", Date.now().toString());
      const qs = `?${params.toString()}`;

      const yieldRes = await fetch(`/api/reports/yield${qs}`, { cache: "no-store" });
      if (yieldRes.ok) {
        const y = await yieldRes.json();
        setRecords(y.data || []);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedCategory, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchReports(false);
  }, [fetchReports]);

  // Subtle background auto-sync every 20s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchReports(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchReports]);

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
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setActivePreset("all");
  };

  // Filtered Return Sheet rows
  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return records.filter((r) => {
      if (!q) return true;
      return (
        (r.consumable_name || "").toLowerCase().includes(q) ||
        (r.reference_number || "").toLowerCase().includes(q) ||
        (r.requested_by || "").toLowerCase().includes(q) ||
        (r.issued_by || "").toLowerCase().includes(q) ||
        (r.received_by || "").toLowerCase().includes(q)
      );
    });
  }, [records, searchTerm]);

  // ── LIVE KPIs ─────────────────────────────────────────────────────────────
  const liveKpis = useMemo(() => {
    const totalRequests = filteredRecords.length;
    let pendingIssueCount = 0;
    let issuedPendingReturnCount = 0;
    let completedCount = 0;

    let totalReqQty = 0;
    let totalIssQty = 0;
    let completedIssQty = 0;
    let totalConsumption = 0;

    let exactIssuedCount = 0;
    let moreIssuedCount = 0;
    let lessIssuedCount = 0;

    filteredRecords.forEach((r) => {
      const reqQ = Number(r.quantity_requested ?? 0);
      const hasIssued = r.quantity_issued !== null && r.quantity_issued !== undefined;
      const issQ = hasIssued ? Number(r.quantity_issued) : 0;
      const hasCons = r.total_consumption !== null && r.total_consumption !== undefined;
      const consQ = hasCons ? Number(r.total_consumption) : 0;

      totalReqQty += reqQ;
      totalIssQty += issQ;
      totalConsumption += consQ;

      if (r.status === "Pending Issue") {
        pendingIssueCount++;
      } else if (r.status === "Issued") {
        issuedPendingReturnCount++;
      } else {
        completedCount++;
        completedIssQty += issQ;
      }

      if (hasIssued) {
        const diff = issQ - reqQ;
        if (diff === 0) exactIssuedCount++;
        else if (diff > 0) moreIssuedCount++;
        else lessIssuedCount++;
      }
    });

    const fulfillmentRate =
      totalReqQty > 0 ? Math.round((totalIssQty / totalReqQty) * 100) : 0;
    const avgYieldPerIssuedUnit =
      completedIssQty > 0
        ? Math.round(totalConsumption / completedIssQty)
        : totalIssQty > 0
        ? Math.round(totalConsumption / totalIssQty)
        : 0;

    return {
      totalRequests,
      pendingIssueCount,
      issuedPendingReturnCount,
      completedCount,
      totalReqQty,
      totalIssQty,
      totalConsumption,
      exactIssuedCount,
      moreIssuedCount,
      lessIssuedCount,
      fulfillmentRate,
      avgYieldPerIssuedUnit,
    };
  }, [filteredRecords]);

  // ── DYNAMIC CONSUMABLE TYPE ANALYTICS ─────────────────────────────────────
  const dynamicTypeStats = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        requests: number;
        issuedPending: number;
        completed: number;
        requestedQty: number;
        issuedQty: number;
        completedIssuedQty: number;
        consumption: number;
      }
    >();

    const baseTypes =
      selectedCategory === "all"
        ? categories.map((c) => c.name)
        : [selectedCategory];

    baseTypes.forEach((tName) => {
      if (!tName) return;
      map.set(tName.toLowerCase(), {
        name: tName,
        requests: 0,
        issuedPending: 0,
        completed: 0,
        requestedQty: 0,
        issuedQty: 0,
        completedIssuedQty: 0,
        consumption: 0,
      });
    });

    filteredRecords.forEach((r) => {
      const key = (r.consumable_name || "Unknown").toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: r.consumable_name || "Unknown",
          requests: 0,
          issuedPending: 0,
          completed: 0,
          requestedQty: 0,
          issuedQty: 0,
          completedIssuedQty: 0,
          consumption: 0,
        });
      }
      const entry = map.get(key)!;
      const reqQ = Number(r.quantity_requested ?? 0);
      const issQ = Number(r.quantity_issued ?? 0);
      const consQ = Number(r.total_consumption ?? 0);

      entry.requests += 1;
      entry.requestedQty += reqQ;
      entry.issuedQty += issQ;
      entry.consumption += consQ;

      if (r.status === "Issued") entry.issuedPending += 1;
      else if (r.status === "Completed") {
        entry.completed += 1;
        entry.completedIssuedQty += issQ;
      }
    });

    return Array.from(map.values()).map((item, idx) => {
      const avgYield =
        item.completedIssuedQty > 0
          ? Math.round(item.consumption / item.completedIssuedQty)
          : item.issuedQty > 0
          ? Math.round(item.consumption / item.issuedQty)
          : 0;
      const consumptionShare =
        liveKpis.totalConsumption > 0
          ? Math.round((item.consumption / liveKpis.totalConsumption) * 100)
          : 0;
      const hex = CHART_COLORS[idx % CHART_COLORS.length];

      return {
        ...item,
        avgYield,
        consumptionShare,
        hex,
      };
    });
  }, [filteredRecords, categories, selectedCategory, liveKpis.totalConsumption]);

  // ── DYNAMIC MONTHLY TIMELINE ──────────────────────────────────────────────
  const timelineSeries = useMemo(() => {
    const buckets = new Map<
      string,
      {
        key: string;
        label: string;
        requests: number;
        requestedQty: number;
        issuedQty: number;
        consumption: number;
      }
    >();

    filteredRecords.forEach((r) => {
      const rawDate = (r.date_requested || "").slice(0, 10);
      if (!rawDate) return;
      const ym = rawDate.slice(0, 7);
      if (!buckets.has(ym)) {
        buckets.set(ym, {
          key: ym,
          label: formatMonthBucketLabel(ym),
          requests: 0,
          requestedQty: 0,
          issuedQty: 0,
          consumption: 0,
        });
      }
      const b = buckets.get(ym)!;
      b.requests += 1;
      b.requestedQty += Number(r.quantity_requested ?? 0);
      b.issuedQty += Number(r.quantity_issued ?? 0);
      b.consumption += Number(r.total_consumption ?? 0);
    });

    return Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredRecords]);

  // ── PERSONNEL STATS ───────────────────────────────────────────────────────
  const personnelStats = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        batches: number;
        completedBatches: number;
        requestedQty: number;
        issuedQty: number;
        consumption: number;
        typesSet: Set<string>;
      }
    >();

    filteredRecords.forEach((r) => {
      const rawName = (r.requested_by || "").trim().toUpperCase();
      if (!rawName) return;
      if (!map.has(rawName)) {
        map.set(rawName, {
          name: rawName,
          batches: 0,
          completedBatches: 0,
          requestedQty: 0,
          issuedQty: 0,
          consumption: 0,
          typesSet: new Set(),
        });
      }
      const p = map.get(rawName)!;
      p.batches += 1;
      if (r.status === "Completed") p.completedBatches += 1;
      p.requestedQty += Number(r.quantity_requested ?? 0);
      p.issuedQty += Number(r.quantity_issued ?? 0);
      p.consumption += Number(r.total_consumption ?? 0);
      if (r.consumable_name) p.typesSet.add(r.consumable_name);
    });

    return Array.from(map.values())
      .map((p) => ({
        ...p,
        typesList: Array.from(p.typesSet),
      }))
      .sort((a, b) => b.consumption - a.consumption || b.issuedQty - a.issuedQty);
  }, [filteredRecords]);

  // ── EXCEL EXPORT (.xlsx) ──────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert("No report data available to export.");
      return;
    }

    const wb = XLSX.utils.book_new();
    const borderAll = {
      top: { style: "thin", color: { rgb: "94A3B8" } },
      bottom: { style: "thin", color: { rgb: "94A3B8" } },
      left: { style: "thin", color: { rgb: "94A3B8" } },
      right: { style: "thin", color: { rgb: "94A3B8" } },
    };

    const bannerStyle = {
      font: { bold: true, sz: 11, color: { rgb: "0F172A" } },
      fill: { fgColor: { rgb: "E2E8F0" }, patternType: "solid" },
      alignment: { horizontal: "center", vertical: "center" },
      border: borderAll,
    };

    const colHeaderStyle = {
      font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1B5E20" }, patternType: "solid" },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: borderAll,
    };

    const cellStyle = {
      font: { sz: 10, color: { rgb: "0F172A" } },
      alignment: { vertical: "center", horizontal: "left" },
      border: borderAll,
    };

    const numCellStyle = {
      font: { sz: 10, color: { rgb: "0F172A" } },
      alignment: { vertical: "center", horizontal: "center" },
      border: borderAll,
    };

    const totalRowStyle = {
      font: { bold: true, sz: 10, color: { rgb: "1B5E20" } },
      fill: { fgColor: { rgb: "E8F5E9" }, patternType: "solid" },
      alignment: { vertical: "center", horizontal: "center" },
      border: borderAll,
    };

    const row0 = [
      "CONSUMABLES REQUEST",
      "",
      "",
      "",
      "",
      "",
      "",
      "PRODUCTION RESULT",
      "",
    ];
    const row1 = [
      "DATE REQUESTED",
      "CONSUMABLE TYPE",
      "QUANTITY REQUESTED",
      "QUANTITY ISSUED",
      "ISSUED BY",
      "REQUESTED BY",
      "RECEIVED BY",
      "DATE RETURNED",
      "TOTAL CONSUMPTION",
    ];

    const dataRows = filteredRecords.map((rec) => [
      formatShortDate(rec.date_requested),
      rec.consumable_name,
      Number(rec.quantity_requested ?? 0),
      rec.quantity_issued !== null && rec.quantity_issued !== undefined
        ? Number(rec.quantity_issued)
        : "",
      rec.issued_by || "",
      rec.requested_by || "",
      rec.received_by || "",
      formatShortDate(rec.date_returned),
      rec.total_consumption !== null && rec.total_consumption !== undefined
        ? Number(rec.total_consumption)
        : "",
    ]);

    const totalsRow = [
      "TOTAL",
      `${filteredRecords.length} Records`,
      liveKpis.totalReqQty,
      liveKpis.totalIssQty,
      "",
      "",
      "",
      "",
      liveKpis.totalConsumption,
    ];

    const aoa = [row0, row1, ...dataRows, totalsRow];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 0, c: 7 }, e: { r: 0, c: 8 } },
    ];

    ws["!cols"] = [
      { wch: 16 },
      { wch: 24 },
      { wch: 20 },
      { wch: 17 },
      { wch: 22 },
      { wch: 24 },
      { wch: 24 },
      { wch: 16 },
      { wch: 20 },
    ];

    const range = XLSX.utils.decode_range(ws["!ref"] || "A1:I2");
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const ref = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[ref]) ws[ref] = { t: "s", v: "" };
        if (R === 0) ws[ref].s = bannerStyle;
        else if (R === 1) ws[ref].s = colHeaderStyle;
        else if (R === aoa.length - 1) ws[ref].s = totalRowStyle;
        else if (C === 2 || C === 3 || C === 8) ws[ref].s = numCellStyle;
        else ws[ref].s = cellStyle;
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, "CONSUMABLES RETURN SHEET");

    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `DVLA_Consumables_Return_Report_${dateStr}.xlsx`);
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    selectedCategory !== "all" ||
    statusFilter !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const maxTrendConsumption = Math.max(1, ...timelineSeries.map((m) => m.consumption));
  const maxTrendQty = Math.max(
    1,
    ...timelineSeries.map((m) => Math.max(m.requestedQty, m.issuedQty))
  );
  const maxTypeConsumption = Math.max(1, ...dynamicTypeStats.map((t) => t.consumption));
  const maxOfficerConsumption = Math.max(1, ...personnelStats.map((p) => p.consumption));

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* ── CLEAN PAGE HEADER ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Reports & Analytics
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Overview of consumable requests, issued quantities, and production consumption.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-2 border-slate-200 text-slate-600 h-9 font-normal"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>

            <Button
              size="sm"
              onClick={handleExportExcel}
              className="bg-dvla-green hover:bg-dvla-green-light text-white gap-2 font-medium h-9"
            >
              <FileSpreadsheet className="h-4 w-4 text-dvla-gold" />
              Export Excel (.xlsx)
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchReports(false)}
              title="Refresh Report"
              className="h-9 w-9 border-slate-200 text-slate-500"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* ── SPACIOUS 4-CARD KPI SUMMARY ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="border-slate-200/80 bg-white shadow-none py-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-medium">Total Requests</span>
                <Package className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-2xl font-semibold text-slate-900">
                {liveKpis.totalRequests.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {liveKpis.completedCount} completed • {liveKpis.issuedPendingReturnCount} in production
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white shadow-none py-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-medium">Quantity Requested</span>
                <Layers className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-semibold text-slate-900">
                {liveKpis.totalReqQty.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Across {dynamicTypeStats.filter((t) => t.requests > 0).length} active consumable types
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white shadow-none py-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-medium">Quantity Issued</span>
                <CheckSquare className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl font-semibold text-slate-900">
                  {liveKpis.totalIssQty.toLocaleString()}
                </span>
                <span className="text-xs text-blue-600 font-normal">
                  ({liveKpis.fulfillmentRate}% of requested)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {liveKpis.exactIssuedCount} exact • {liveKpis.moreIssuedCount} more • {liveKpis.lessIssuedCount} less
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white shadow-none py-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-medium">Total Consumption (Work Done)</span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-semibold text-emerald-700">
                {liveKpis.totalConsumption.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Avg {liveKpis.avgYieldPerIssuedUnit.toLocaleString()} output per unit issued
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── STREAMLINED FILTER BAR ──────────────────────────────────────── */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 space-y-4 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-4 space-y-1.5">
              <Label className="text-xs font-normal text-slate-500">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Officer name, consumable type, or ref..."
                  className="pl-9 bg-slate-50/70 border-slate-200 text-xs h-9 font-normal"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="lg:col-span-3 space-y-1.5">
              <Label className="text-xs font-normal text-slate-500">Consumable Type</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-slate-50/70 border-slate-200 text-xs h-9 font-normal">
                  <SelectValue placeholder="All Consumable Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Consumable Types</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2 space-y-1.5">
              <Label className="text-xs font-normal text-slate-500">Workflow Stage</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-slate-50/70 border-slate-200 text-xs h-9 font-normal">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="Pending Issue">Pending Issue</SelectItem>
                  <SelectItem value="Issued">Issued</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-3 flex items-center gap-2">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs font-normal text-slate-500">From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setActivePreset("custom");
                    setDateFrom(e.target.value);
                  }}
                  className="bg-slate-50/70 border-slate-200 text-xs h-9 font-normal"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs font-normal text-slate-500">To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setActivePreset("custom");
                    setDateTo(e.target.value);
                  }}
                  className="bg-slate-50/70 border-slate-200 text-xs h-9 font-normal"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 mr-1">Quick Period:</span>
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
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                    activePreset === preset.id
                      ? "bg-dvla-green text-white font-medium"
                      : "text-slate-600 hover:bg-slate-100 font-normal"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* ── CLEAN 2-COLUMN DYNAMIC GRAPHS ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
          {/* LEFT GRAPH: Monthly Trend */}
          <Card className="lg:col-span-7 border-slate-200/80 bg-white shadow-none py-0">
            <CardHeader className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-medium text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-dvla-green" />
                  Monthly Activity Trend
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  {hoveredMonthIdx !== null && timelineSeries[hoveredMonthIdx]
                    ? `${timelineSeries[hoveredMonthIdx].label}: ${timelineSeries[hoveredMonthIdx].requestedQty} requested, ${timelineSeries[hoveredMonthIdx].issuedQty} issued, ${timelineSeries[hoveredMonthIdx].consumption.toLocaleString()} consumption`
                    : "Hover over any bar to inspect monthly figures"}
                </CardDescription>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTrendMode("consumption")}
                  className={`px-3 py-1 rounded-md text-xs transition-all ${
                    trendMode === "consumption"
                      ? "bg-white text-slate-900 shadow-xs font-medium"
                      : "text-slate-600 hover:text-slate-900 font-normal"
                  }`}
                >
                  Consumption
                </button>
                <button
                  type="button"
                  onClick={() => setTrendMode("quantities")}
                  className={`px-3 py-1 rounded-md text-xs transition-all ${
                    trendMode === "quantities"
                      ? "bg-white text-slate-900 shadow-xs font-medium"
                      : "text-slate-600 hover:text-slate-900 font-normal"
                  }`}
                >
                  Requested vs. Issued
                </button>
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6 pt-2">
              {timelineSeries.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-xs text-slate-400">
                  No timeline data available for the selected filters.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative h-52 pt-6 pb-2 border-b border-slate-100 flex items-end gap-3 sm:gap-5 justify-around">
                    {/* Subtle horizontal guide lines */}
                    <div className="absolute inset-x-0 top-6 bottom-2 flex flex-col justify-between pointer-events-none">
                      {[1, 0.5, 0].map((tick) => (
                        <div
                          key={tick}
                          className="border-b border-dashed border-slate-100 w-full"
                        />
                      ))}
                    </div>

                    {timelineSeries.map((item, idx) => {
                      const consHeightPct = Math.max(
                        4,
                        Math.round((item.consumption / maxTrendConsumption) * 100)
                      );
                      const reqHeightPct = Math.max(
                        4,
                        Math.round((item.requestedQty / maxTrendQty) * 100)
                      );
                      const issHeightPct = Math.max(
                        4,
                        Math.round((item.issuedQty / maxTrendQty) * 100)
                      );

                      return (
                        <div
                          key={item.key}
                          onMouseEnter={() => setHoveredMonthIdx(idx)}
                          onMouseLeave={() => setHoveredMonthIdx(null)}
                          className="relative z-10 flex-1 flex flex-col items-center h-full justify-end group"
                        >
                          <div className="mb-1.5 text-[11px] text-slate-500 font-normal">
                            {trendMode === "consumption"
                              ? item.consumption > 999
                                ? `${(item.consumption / 1000).toFixed(1)}k`
                                : item.consumption
                              : `${item.requestedQty}/${item.issuedQty}`}
                          </div>

                          <div className="w-full max-w-[44px] flex items-end justify-center gap-1 h-[145px]">
                            {trendMode === "consumption" ? (
                              <div
                                className="w-full rounded-t-md bg-dvla-green/85 group-hover:bg-dvla-green transition-all duration-300"
                                style={{ height: `${consHeightPct}%` }}
                              />
                            ) : (
                              <>
                                <div
                                  className="w-1/2 rounded-t-sm bg-amber-400 transition-all duration-300"
                                  style={{ height: `${reqHeightPct}%` }}
                                  title={`Requested: ${item.requestedQty}`}
                                />
                                <div
                                  className="w-1/2 rounded-t-sm bg-blue-500 transition-all duration-300"
                                  style={{ height: `${issHeightPct}%` }}
                                  title={`Issued: ${item.issuedQty}`}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-around gap-2">
                    {timelineSeries.map((item) => (
                      <div
                        key={item.key}
                        className="flex-1 text-center text-xs text-slate-500 font-normal"
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* RIGHT GRAPH: Switchable Breakdown (By Type / Share / Officers) */}
          <Card className="lg:col-span-5 border-slate-200/80 bg-white shadow-none py-0">
            <CardHeader className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-medium text-slate-900 flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-dvla-green" />
                  Consumption Breakdown
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Click any item below to filter the report
                </CardDescription>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
                {(
                  [
                    { id: "types", label: "By Type" },
                    { id: "distribution", label: "Share" },
                    { id: "officers", label: "Officers" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRightChartMode(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                      rightChartMode === tab.id
                        ? "bg-white text-slate-900 shadow-xs font-medium"
                        : "text-slate-600 hover:text-slate-900 font-normal"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6 pt-2">
              {rightChartMode === "types" && (
                <div className="space-y-4">
                  {dynamicTypeStats.map((t) => {
                    const barWidth = Math.round((t.consumption / maxTypeConsumption) * 100);
                    const isSelected =
                      selectedCategory.toLowerCase() === t.name.toLowerCase();

                    return (
                      <div
                        key={t.name}
                        onClick={() =>
                          setSelectedCategory((prev) =>
                            prev.toLowerCase() === t.name.toLowerCase() ? "all" : t.name
                          )
                        }
                        className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? "border-dvla-green bg-emerald-50/30"
                            : "border-slate-100 hover:bg-slate-50/70"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: t.hex }}
                            />
                            <span className="font-medium text-slate-800">{t.name}</span>
                          </div>
                          <span className="text-slate-500">
                            Req: {t.requestedQty} • Issued: {t.issuedQty} •{" "}
                            <span className="text-emerald-700 font-medium">
                              {t.consumption.toLocaleString()}
                            </span>
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(barWidth, t.consumption > 0 ? 4 : 0)}%`,
                              backgroundColor: t.hex,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {rightChartMode === "distribution" && (
                <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
                  <div className="relative h-40 w-40 shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                      <circle
                        cx="60"
                        cy="60"
                        r="46"
                        fill="transparent"
                        stroke="#f1f5f9"
                        strokeWidth="14"
                      />
                      {(() => {
                        const circumference = 2 * Math.PI * 46;
                        let cumulativePct = 0;
                        return dynamicTypeStats
                          .filter((i) => i.consumption > 0)
                          .map((item) => {
                            const strokeDasharray = `${
                              (item.consumptionShare / 100) * circumference
                            } ${circumference}`;
                            const strokeDashoffset = -(cumulativePct / 100) * circumference;
                            cumulativePct += item.consumptionShare;
                            return (
                              <circle
                                key={item.name}
                                cx="60"
                                cy="60"
                                r="46"
                                fill="transparent"
                                stroke={item.hex}
                                strokeWidth="14"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-500"
                              />
                            );
                          });
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[11px] text-slate-400">Total Output</span>
                      <span className="text-sm font-semibold text-slate-800">
                        {liveKpis.totalConsumption.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-2.5">
                    {dynamicTypeStats.map((t) => (
                      <div
                        key={t.name}
                        onClick={() =>
                          setSelectedCategory((prev) =>
                            prev.toLowerCase() === t.name.toLowerCase() ? "all" : t.name
                          )
                        }
                        className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-slate-50 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: t.hex }}
                          />
                          <span className="text-slate-700">{t.name}</span>
                        </div>
                        <span className="text-slate-500">
                          {t.consumption.toLocaleString()} ({t.consumptionShare}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rightChartMode === "officers" && (
                <div className="space-y-3.5">
                  {personnelStats.slice(0, 5).map((officer) => {
                    const barPct = Math.max(
                      4,
                      Math.round((officer.consumption / maxOfficerConsumption) * 100)
                    );
                    return (
                      <div
                        key={officer.name}
                        onClick={() =>
                          setSearchTerm((prev) =>
                            prev.trim().toUpperCase() === officer.name ? "" : officer.name
                          )
                        }
                        className="p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50/70 cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium text-slate-800">{officer.name}</span>
                          <span className="text-slate-500">
                            {officer.batches} requests •{" "}
                            <span className="text-emerald-700 font-medium">
                              {officer.consumption.toLocaleString()}
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-dvla-green/80 rounded-full transition-all duration-500"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── TABLE TABS & DATA VIEWS ─────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-wrap border-b border-slate-200 gap-4 print:hidden">
            <button
              onClick={() => setActiveTab("return_sheet")}
              className={`pb-3 px-2 text-sm border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "return_sheet"
                  ? "border-dvla-green text-dvla-green font-medium"
                  : "border-transparent text-slate-500 hover:text-slate-800 font-normal"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Consumables Return Sheet ({filteredRecords.length})
            </button>

            <button
              onClick={() => setActiveTab("type_summary")}
              className={`pb-3 px-2 text-sm border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "type_summary"
                  ? "border-dvla-green text-dvla-green font-medium"
                  : "border-transparent text-slate-500 hover:text-slate-800 font-normal"
              }`}
            >
              <Layers className="h-4 w-4" />
              Summary by Consumable Type
            </button>

            <button
              onClick={() => setActiveTab("personnel")}
              className={`pb-3 px-2 text-sm border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "personnel"
                  ? "border-dvla-green text-dvla-green font-medium"
                  : "border-transparent text-slate-500 hover:text-slate-800 font-normal"
              }`}
            >
              <Users className="h-4 w-4" />
              Officer Summary
            </button>
          </div>

          {/* TAB 1: CONSUMABLES RETURN SHEET TABLE */}
          {activeTab === "return_sheet" && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <th
                        colSpan={7}
                        className="py-2.5 px-4 text-center font-medium tracking-wide border-r border-slate-200"
                      >
                        CONSUMABLES REQUEST
                      </th>
                      <th
                        colSpan={2}
                        className="py-2.5 px-4 text-center font-medium tracking-wide bg-emerald-50/70 text-emerald-900"
                      >
                        PRODUCTION RESULT
                      </th>
                    </tr>
                    <tr className="bg-dvla-green text-white border-b border-slate-200">
                      <th className="py-3 px-4 text-left font-medium border-r border-white/10 whitespace-nowrap">
                        Date Requested
                      </th>
                      <th className="py-3 px-4 text-left font-medium border-r border-white/10 whitespace-nowrap">
                        Consumable Type
                      </th>
                      <th className="py-3 px-4 text-center font-medium border-r border-white/10 whitespace-nowrap">
                        Qty Requested
                      </th>
                      <th className="py-3 px-4 text-center font-medium border-r border-white/10 whitespace-nowrap">
                        Qty Issued
                      </th>
                      <th className="py-3 px-4 text-left font-medium border-r border-white/10 whitespace-nowrap">
                        Issued By
                      </th>
                      <th className="py-3 px-4 text-left font-medium border-r border-white/10 whitespace-nowrap">
                        Requested By
                      </th>
                      <th className="py-3 px-4 text-left font-medium border-r border-slate-300 whitespace-nowrap">
                        Received By
                      </th>
                      <th className="py-3 px-4 text-center font-medium border-r border-white/10 whitespace-nowrap">
                        Date Returned
                      </th>
                      <th className="py-3 px-4 text-right font-medium whitespace-nowrap">
                        Total Consumption
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-slate-400">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-dvla-green mb-1.5" />
                          Loading report...
                        </td>
                      </tr>
                    ) : filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-slate-400">
                          No records match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((rec) => {
                        const reqQ = Number(rec.quantity_requested ?? 0);
                        const issQ =
                          rec.quantity_issued !== null && rec.quantity_issued !== undefined
                            ? Number(rec.quantity_issued)
                            : null;

                        return (
                          <tr
                            key={rec.id}
                            className="bg-white hover:bg-slate-50/70 transition-colors"
                          >
                            <td className="py-3 px-4 text-slate-600 border-r border-slate-100 whitespace-nowrap">
                              {formatShortDate(rec.date_requested)}
                            </td>
                            <td className="py-3 px-4 text-slate-800 font-medium border-r border-slate-100 whitespace-nowrap">
                              {rec.consumable_name}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-700 border-r border-slate-100">
                              {reqQ}
                            </td>
                            <td className="py-3 px-4 text-center text-blue-700 font-medium border-r border-slate-100">
                              {issQ !== null ? issQ : "—"}
                            </td>
                            <td className="py-3 px-4 text-slate-600 border-r border-slate-100 whitespace-nowrap">
                              {rec.issued_by || "—"}
                            </td>
                            <td className="py-3 px-4 text-slate-700 border-r border-slate-100 whitespace-nowrap">
                              {rec.requested_by || "—"}
                            </td>
                            <td className="py-3 px-4 text-slate-600 border-r border-slate-200 whitespace-nowrap">
                              {rec.received_by || "—"}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-600 border-r border-slate-100 whitespace-nowrap">
                              {formatShortDate(rec.date_returned) || "—"}
                            </td>
                            <td className="py-3 px-4 text-right text-emerald-700 font-medium whitespace-nowrap">
                              {rec.total_consumption !== null &&
                              rec.total_consumption !== undefined
                                ? Number(rec.total_consumption).toLocaleString()
                                : "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {filteredRecords.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50 border-t border-slate-200 font-medium text-slate-800">
                        <td className="py-3 px-4 border-r border-slate-200">Total</td>
                        <td className="py-3 px-4 border-r border-slate-200 text-slate-500 font-normal">
                          {filteredRecords.length} records
                        </td>
                        <td className="py-3 px-4 text-center border-r border-slate-200">
                          {liveKpis.totalReqQty.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center border-r border-slate-200 text-blue-700">
                          {liveKpis.totalIssQty.toLocaleString()}
                        </td>
                        <td colSpan={3} className="border-r border-slate-200" />
                        <td className="py-3 px-4 text-center border-r border-slate-200 text-slate-500 font-normal">
                          Total Consumption
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-700">
                          {liveKpis.totalConsumption.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: SUMMARY BY CONSUMABLE TYPE */}
          {activeTab === "type_summary" && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70">
                    <TableHead className="font-medium text-slate-600">Consumable Type</TableHead>
                    <TableHead className="text-center font-medium text-slate-600">
                      Requests
                    </TableHead>
                    <TableHead className="text-center font-medium text-slate-600">
                      Qty Requested
                    </TableHead>
                    <TableHead className="text-center font-medium text-slate-600">
                      Qty Issued
                    </TableHead>
                    <TableHead className="text-center font-medium text-slate-600">
                      Pending Return
                    </TableHead>
                    <TableHead className="text-center font-medium text-slate-600">
                      Completed
                    </TableHead>
                    <TableHead className="text-center font-medium text-slate-600">
                      Avg Output / Unit
                    </TableHead>
                    <TableHead className="text-right font-medium text-slate-600">
                      Total Consumption
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dynamicTypeStats.map((t) => (
                    <TableRow key={t.name} className="hover:bg-slate-50/60">
                      <TableCell className="font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: t.hex }}
                          />
                          {t.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-slate-600">{t.requests}</TableCell>
                      <TableCell className="text-center text-slate-700">
                        {t.requestedQty.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-blue-700">
                        {t.issuedQty.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-amber-600">
                        {t.issuedPending}
                      </TableCell>
                      <TableCell className="text-center text-emerald-700">
                        {t.completed}
                      </TableCell>
                      <TableCell className="text-center text-slate-600">
                        {t.avgYield.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-700">
                        {t.consumption.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-slate-50 font-medium text-slate-800">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-center">{liveKpis.totalRequests}</TableCell>
                    <TableCell className="text-center">
                      {liveKpis.totalReqQty.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center text-blue-700">
                      {liveKpis.totalIssQty.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center text-amber-600">
                      {liveKpis.issuedPendingReturnCount}
                    </TableCell>
                    <TableCell className="text-center text-emerald-700">
                      {liveKpis.completedCount}
                    </TableCell>
                    <TableCell className="text-center text-slate-600">
                      {liveKpis.avgYieldPerIssuedUnit.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-emerald-700">
                      {liveKpis.totalConsumption.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}

          {/* TAB 3: OFFICER SUMMARY */}
          {activeTab === "personnel" && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/70">
                    <TableHead className="font-medium text-slate-600">Officer Name</TableHead>
                    <TableHead className="text-center font-medium text-slate-600">
                      Requests
                    </TableHead>
                    <TableHead className="text-center font-medium text-slate-600">
                      Completed Returns
                    </TableHead>
                    <TableHead className="text-center font-medium text-slate-600">
                      Qty Requested
                    </TableHead>
                    <TableHead className="text-center font-medium text-slate-600">
                      Qty Issued
                    </TableHead>
                    <TableHead className="font-medium text-slate-600">
                      Consumable Types
                    </TableHead>
                    <TableHead className="text-right font-medium text-slate-600">
                      Total Consumption
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personnelStats.map((p) => (
                    <TableRow key={p.name} className="hover:bg-slate-50/60">
                      <TableCell className="font-medium text-slate-800">{p.name}</TableCell>
                      <TableCell className="text-center text-slate-600">{p.batches}</TableCell>
                      <TableCell className="text-center text-emerald-700">
                        {p.completedBatches}
                      </TableCell>
                      <TableCell className="text-center text-slate-700">
                        {p.requestedQty.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-blue-700">
                        {p.issuedQty.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        <div className="flex flex-wrap gap-1.5">
                          {p.typesList.map((t) => (
                            <Badge
                              key={t}
                              variant="outline"
                              className="font-normal text-[11px] bg-slate-50 border-slate-200 text-slate-600"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-700">
                        {p.consumption.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
