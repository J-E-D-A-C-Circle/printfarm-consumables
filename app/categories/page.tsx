"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Download,
  RefreshCw,
  Loader2,
  Plus,
  Trash2,
  PackageOpen,
  AlertCircle,
  CheckCircle2,
  Send,
  TrendingUp,
  Edit3,
  Package,
  CheckSquare,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { IssueStockModal } from "@/components/IssueStockModal";
import { ReconciliationModal, ReturnSheetRecord } from "@/components/ReconciliationModal";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import * as XLSX from "xlsx-js-style";

interface Category {
  id: number;
  name: string;
  code_prefix?: string;
  item_count?: number;
  total_requested?: number;
  total_issued?: number;
  total_consumption?: number;
}

interface SummaryMetrics {
  total_requests: number;
  pending_issue: number;
  issued_pending_return: number;
  completed: number;
  total_requested_qty: number;
  total_issued_qty: number;
  total_consumption: number;
}

function formatShortDate(dateStr?: string | null) {
  if (!dateStr) return "";
  const clean = dateStr.slice(0, 10);
  const parts = clean.split("-");
  if (parts.length !== 3) return clean;
  return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
}

function CategoriesContent() {
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryFilter || "all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [records, setRecords] = useState<ReturnSheetRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<SummaryMetrics>({
    total_requests: 0,
    pending_issue: 0,
    issued_pending_return: 0,
    completed: 0,
    total_requested_qty: 0,
    total_issued_qty: 0,
    total_consumption: 0,
  });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Manage Consumable Types Modal State
  const [manageTypesOpen, setManageTypesOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<number | null>(null);
  const [typeMsg, setTypeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (categoryFilter) {
      setSelectedCategory(categoryFilter);
    } else {
      setSelectedCategory("all");
    }
    setCurrentPage(1);
  }, [categoryFilter]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      params.set("page", String(currentPage));
      params.set("limit", String(pageSize));

      const [issuesRes, catsRes] = await Promise.all([
        fetch(`/api/issues?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);

      if (issuesRes.ok) {
        const d = await issuesRes.json();
        setRecords(d.data || []);
        if (d.summary) setSummary(d.summary);
      }
      if (catsRes.ok) {
        const d = await catsRes.json();
        setCategories(d.data || []);
      }
    } catch (err) {
      console.error("Failed to load return sheet records:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, selectedStatus, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedStatus]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const totalPages = Math.max(1, Math.ceil((summary.total_requests || 0) / pageSize));
  const startRow = summary.total_requests === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, summary.total_requests || 0);

  const tableTotals = useMemo(() => {
    let totalReq = 0;
    let totalIss = 0;
    let totalCons = 0;

    records.forEach((r) => {
      totalReq += Number(r.quantity_requested ?? 0);
      totalIss += Number(r.quantity_issued ?? 0);
      totalCons += Number(r.total_consumption ?? 0);
    });

    return { totalReq, totalIss, totalCons };
  }, [records]);

  const handleDeleteRecord = async (rec: ReturnSheetRecord) => {
    const name = rec.consumable_name || rec.category || "Consumable";
    if (!confirm(`Delete record #${rec.reference_number} (${name} requested by ${rec.requested_by})?`)) {
      return;
    }
    setDeletingId(rec.id);
    try {
      const res = await fetch(`/api/issues?id=${rec.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete record.");
      await loadRecords();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting record.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    setTypeMsg(null);
    setAddingCat(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          code_prefix: trimmed.slice(0, 4).toUpperCase(),
          purpose: "printing",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add consumable type.");
      setTypeMsg({ type: "success", text: `Consumable type "${trimmed}" added.` });
      setNewCatName("");
      await loadRecords();
    } catch (err: unknown) {
      setTypeMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Error adding consumable type.",
      });
    } finally {
      setAddingCat(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`Remove consumable type "${cat.name}"?`)) return;
    setTypeMsg(null);
    setDeletingCatId(cat.id);
    try {
      const res = await fetch("/api/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, name: cat.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Cannot remove "${cat.name}".`);
      setTypeMsg({ type: "success", text: `Consumable type "${cat.name}" removed.` });
      await loadRecords();
    } catch (err: unknown) {
      setTypeMsg({
        type: "error",
        text: err instanceof Error ? err.message : `Cannot remove "${cat.name}".`,
      });
    } finally {
      setDeletingCatId(null);
    }
  };

  const handleExportExcel = () => {
    if (records.length === 0) {
      alert("No records available to export.");
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
      font: { sz: 10, bold: true, color: { rgb: "0F172A" } },
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

    const dataRows = [...records]
      .sort((a, b) => (a.date_requested || "").localeCompare(b.date_requested || ""))
      .map((rec) => [
        formatShortDate(rec.date_requested),
        rec.consumable_name || rec.category || "",
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
      `${records.length} Records`,
      tableTotals.totalReq,
      tableTotals.totalIss,
      "",
      "",
      "",
      "",
      tableTotals.totalCons,
    ];

    const ws = XLSX.utils.aoa_to_sheet([row0, row1, ...dataRows, totalsRow]);

    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 0, c: 7 }, e: { r: 0, c: 8 } },
    ];

    for (let c = 0; c <= 8; c++) {
      const a0 = XLSX.utils.encode_cell({ r: 0, c });
      const a1 = XLSX.utils.encode_cell({ r: 1, c });
      if (ws[a0]) ws[a0].s = bannerStyle;
      if (ws[a1]) ws[a1].s = colHeaderStyle;
    }

    const centerCols = [0, 2, 3, 7, 8];
    dataRows.forEach((rData, idx) => {
      const rIdx = idx + 2;
      rData.forEach((_, cIdx) => {
        const addr = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
        if (ws[addr]) {
          ws[addr].s = centerCols.includes(cIdx) ? numCellStyle : cellStyle;
        }
      });
    });

    const totRowIndex = dataRows.length + 2;
    totalsRow.forEach((_, cIdx) => {
      const addr = XLSX.utils.encode_cell({ r: totRowIndex, c: cIdx });
      if (ws[addr]) ws[addr].s = totalRowStyle;
    });

    ws["!cols"] = [
      { wch: 16 },
      { wch: 24 },
      { wch: 20 },
      { wch: 18 },
      { wch: 22 },
      { wch: 22 },
      { wch: 24 },
      { wch: 16 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "CONSUMABLES RETURN SHEET");
    XLSX.writeFile(
      wb,
      `DVLA_Consumables_Return_Sheet_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Clean Page Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Consumables Return Sheet
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Request consumable quantities, issue exact, more, or less than requested, and record total consumption.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={() => {
                setManageTypesOpen(true);
                setTypeMsg(null);
              }}
              variant="outline"
              size="sm"
              className="h-9 gap-2 border-slate-200 text-slate-600 font-normal"
            >
              <PackageOpen className="h-4 w-4 text-dvla-green" />
              Consumable Types
            </Button>
            <Button
              onClick={handleExportExcel}
              variant="outline"
              size="sm"
              className="h-9 gap-2 border-slate-200 text-slate-600 font-normal"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              Export Excel (.xlsx)
            </Button>
            <IssueStockModal
              defaultCategory={selectedCategory !== "all" ? selectedCategory : undefined}
              onSuccess={loadRecords}
            >
              <Button
                size="sm"
                className="h-9 gap-2 bg-dvla-green hover:bg-dvla-green-light text-white font-medium"
              >
                <Plus className="h-4 w-4" />
                New Request / Return Entry
              </Button>
            </IssueStockModal>
          </div>
        </div>

        {/* Spacious 4-Card KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="border-slate-200/80 bg-white shadow-none py-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-medium">Quantity Requested</span>
                <Package className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-2xl font-semibold text-slate-900">
                {summary.total_requested_qty.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Across {summary.total_requests} request records
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white shadow-none py-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-medium">Quantity Issued</span>
                <CheckSquare className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-semibold text-slate-900">
                {summary.total_issued_qty.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {summary.pending_issue} pending issue
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white shadow-none py-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-medium">In Production (Pending Return)</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-semibold text-slate-900">
                {summary.issued_pending_return}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Awaiting total consumption entry
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
                {summary.total_consumption.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {summary.completed} completed returns
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Streamlined Filter & Search Bar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row justify-between items-stretch sm:items-end gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-slate-500">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Officer name, consumable, or ref..."
                  className="pl-9 bg-slate-50/70 border-slate-200 text-xs h-9 font-normal"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-slate-500">Consumable Type</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-slate-50/70 border-slate-200 text-xs h-9 font-normal">
                  <SelectValue placeholder="All Consumable Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Consumable Types</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-slate-500">Workflow Stage</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="bg-slate-50/70 border-slate-200 text-xs h-9 font-normal">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="Pending Issue">Pending Issue</SelectItem>
                  <SelectItem value="Issued">Issued (Pending Return)</SelectItem>
                  <SelectItem value="Completed">Completed (Returned)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={loadRecords}
            title="Refresh Return Sheet"
            className="h-9 w-9 border-slate-200 text-slate-500 self-end"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* CONSUMABLES RETURN SHEET TABLE (Single "CONSUMABLE TYPE" Column) */}
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
                    colSpan={3}
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
                  <th className="py-3 px-4 text-right font-medium border-r border-white/10 whitespace-nowrap">
                    Total Consumption
                  </th>
                  <th className="py-3 px-4 text-center font-medium whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-dvla-green mb-1.5" />
                      Loading Consumables Return Sheet...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400">
                      No consumable request or return records found. Click{" "}
                      <span className="font-medium text-slate-600">New Request / Return Entry</span> to add one.
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => {
                    const reqQty = Number(rec.quantity_requested ?? 0);
                    const issQty =
                      rec.quantity_issued !== null && rec.quantity_issued !== undefined
                        ? Number(rec.quantity_issued)
                        : null;
                    const diff = issQty !== null ? issQty - reqQty : 0;

                    return (
                      <tr
                        key={rec.id}
                        className="bg-white hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3 px-4 text-slate-600 border-r border-slate-100 whitespace-nowrap">
                          {formatShortDate(rec.date_requested)}
                        </td>

                        <td className="py-3 px-4 text-slate-800 font-medium border-r border-slate-100 whitespace-nowrap">
                          {rec.consumable_name || rec.category}
                        </td>

                        <td className="py-3 px-4 text-center text-slate-700 border-r border-slate-100 whitespace-nowrap">
                          {reqQty}
                        </td>

                        <td className="py-3 px-4 text-center border-r border-slate-100 whitespace-nowrap">
                          {issQty !== null ? (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="font-medium text-blue-700">
                                {issQty}
                              </span>
                              {diff !== 0 && (
                                <span
                                  title={`Requested: ${reqQty}, Issued: ${issQty}`}
                                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    diff < 0
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-blue-50 text-blue-700"
                                  }`}
                                >
                                  {diff > 0 ? `+${diff}` : diff}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-normal"
                            >
                              Pending Issue
                            </Badge>
                          )}
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
                          {rec.date_returned ? (
                            formatShortDate(rec.date_returned)
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right border-r border-slate-100 whitespace-nowrap">
                          {rec.total_consumption !== null &&
                          rec.total_consumption !== undefined ? (
                            <span className="font-medium text-emerald-700">
                              {Number(rec.total_consumption).toLocaleString()}
                            </span>
                          ) : rec.status === "Issued" ? (
                            <span className="text-xs text-amber-600">
                              Pending Return
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {rec.status === "Pending Issue" && (
                              <ReconciliationModal
                                issueRecord={rec}
                                initialMode="issue"
                                onSuccess={loadRecords}
                              >
                                <Button
                                  size="sm"
                                  className="h-7 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-normal gap-1"
                                >
                                  <Send className="h-3 w-3" />
                                  Issue
                                </Button>
                              </ReconciliationModal>
                            )}

                            {rec.status === "Issued" && (
                              <ReconciliationModal
                                issueRecord={rec}
                                initialMode="return"
                                onSuccess={loadRecords}
                              >
                                <Button
                                  size="sm"
                                  className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-normal gap-1"
                                >
                                  <TrendingUp className="h-3 w-3" />
                                  Record Consumption
                                </Button>
                              </ReconciliationModal>
                            )}

                            <ReconciliationModal
                              issueRecord={rec}
                              initialMode="edit"
                              onSuccess={loadRecords}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-dvla-green hover:bg-slate-100"
                                title="Edit Row"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                            </ReconciliationModal>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Delete Row"
                              disabled={deletingId === rec.id}
                              onClick={() => handleDeleteRecord(rec)}
                            >
                              {deletingId === rec.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {records.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-slate-50 shadow-[0_-1px_0_0_rgba(226,232,240,1)]">
                  <tr className="bg-slate-50 border-t-2 border-slate-200 font-medium text-slate-800">
                    <td className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                      Total (All Pages)
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-slate-500 font-normal whitespace-nowrap">
                      {summary.total_requests.toLocaleString()} records
                    </td>
                    <td className="py-3 px-4 text-center border-r border-slate-200">
                      {summary.total_requested_qty.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center border-r border-slate-200 text-blue-700">
                      {summary.total_issued_qty.toLocaleString()}
                    </td>
                    <td colSpan={3} className="border-r border-slate-200" />
                    <td className="py-3 px-4 text-center border-r border-slate-200 text-slate-500 font-normal whitespace-nowrap">
                      Total Consumption
                    </td>
                    <td className="py-3 px-4 text-right border-r border-slate-200 text-emerald-700">
                      {summary.total_consumption.toLocaleString()}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination & Rows Per Page Bar */}
          <div className="px-4 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 rounded-md border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-dvla-green/20"
                >
                  {[20, 30, 50, 70].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-slate-400">|</span>
              <span>
                Showing <span className="font-medium text-slate-800">{startRow}</span>–
                <span className="font-medium text-slate-800">{endRow}</span> of{" "}
                <span className="font-medium text-slate-800">{summary.total_requests}</span> records
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
                className="h-8 px-2.5 text-xs font-normal border-slate-200 gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;
                  return (
                    <span key={p} className="inline-flex items-center gap-1">
                      {showEllipsis && <span className="px-1 text-slate-400">…</span>}
                      <Button
                        variant={currentPage === p ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(p)}
                        className={`h-8 w-8 p-0 text-xs font-medium ${
                          currentPage === p
                            ? "bg-dvla-green hover:bg-dvla-green-light text-white border-dvla-green"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        {p}
                      </Button>
                    </span>
                  );
                })}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || loading}
                className="h-8 px-2.5 text-xs font-normal border-slate-200 gap-1"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* MODAL: MANAGE CONSUMABLE TYPES */}
        <Dialog open={manageTypesOpen} onOpenChange={setManageTypesOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <PackageOpen className="h-5 w-5 text-dvla-green" />
                Manage Consumable Types
              </DialogTitle>
              <DialogDescription>
                Add or remove consumable types classified under the Consumable Type column.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {typeMsg && (
                <div
                  className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
                    typeMsg.type === "success"
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                      : "bg-red-50 border border-red-200 text-red-700"
                  }`}
                >
                  {typeMsg.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                  )}
                  <span>{typeMsg.text}</span>
                </div>
              )}

              <div className="flex items-end gap-2">
                <div className="space-y-1.5 flex-1">
                  <Label className="text-xs font-normal text-slate-500">
                    New Consumable Type Name
                  </Label>
                  <Input
                    placeholder="e.g. Laminate Film"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCategory())}
                  />
                </div>
                <Button
                  onClick={handleAddCategory}
                  disabled={addingCat || !newCatName.trim()}
                  className="bg-dvla-green hover:bg-dvla-green-light text-white font-medium"
                >
                  {addingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Type"}
                </Button>
              </div>

              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 hover:bg-slate-50"
                  >
                    <div>
                      <span className="text-sm font-medium text-slate-800">{cat.name}</span>
                      <span className="ml-2 text-xs text-slate-400">
                        ({cat.item_count || 0} requests)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-600"
                      disabled={deletingCatId === cat.id}
                      onClick={() => handleDeleteCategory(cat)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading Consumables Return Sheet...</div>}>
      <CategoriesContent />
    </Suspense>
  );
}
