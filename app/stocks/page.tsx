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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  RefreshCw,
  Loader2,
  Plus,
  Trash2,
  Edit3,
  Package,
  PackagePlus,
  Boxes,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ArrowUpRight,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { gooeyToast } from "@/components/ui/gooey-toast";

interface StockRecord {
  id: number;
  reference_number: string;
  date_received: string;
  category_id: number | null;
  consumable_name: string;
  quantity_added: number;
  supplier: string | null;
  batch_number: string | null;
  received_by: string;
  remarks: string | null;
  created_at: string;
}

interface TypeBalance {
  id: number;
  name: string;
  code_prefix: string;
  receipt_count: number;
  total_stock_added: number;
  total_issued: number;
  available_stock: number;
}

interface StockSummary {
  total_entries: number;
  filtered_stock_added: number;
  overall_stock_added: number;
  overall_issued: number;
  overall_available: number;
}

function formatShortDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  const clean = dateStr.slice(0, 10);
  const parts = clean.split("-");
  if (parts.length !== 3) return clean;
  return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
}

export default function ConsumableStocksPage() {
  const [records, setRecords] = useState<StockRecord[]>([]);
  const [balances, setBalances] = useState<TypeBalance[]>([]);
  const [summary, setSummary] = useState<StockSummary>({
    total_entries: 0,
    filtered_stock_added: 0,
    overall_stock_added: 0,
    overall_issued: 0,
    overall_available: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Add / Edit Stock Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formConsumable, setFormConsumable] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formBatch, setFormBatch] = useState("");
  const [formSupplier, setFormSupplier] = useState("DVLA Central Store");
  const [formReceivedBy, setFormReceivedBy] = useState("MR. RICHARD ANAFO");
  const [formRemarks, setFormRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Quick Add New Consumable Type inside Modal
  const [addingNewType, setAddingNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [savingNewType, setSavingNewType] = useState(false);

  // Delete Stock Entry Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<StockRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Pre-fill Received By with signed-in user if available
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user?.name) {
          setFormReceivedBy(String(d.user.name).toUpperCase());
        }
      })
      .catch(() => {});
  }, []);

  const loadStocks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      params.set("page", String(currentPage));
      params.set("limit", String(pageSize));

      const res = await fetch(`/api/stocks?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setRecords(d.data || []);
        setBalances(d.balances || []);
        if (d.summary) setSummary(d.summary);
      }
    } catch (err) {
      console.error("Failed to load consumable stocks:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, dateFrom, dateTo, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, dateFrom, dateTo]);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  const totalPages = Math.max(1, Math.ceil((summary.total_entries || 0) / pageSize));
  const startRow = summary.total_entries === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, summary.total_entries || 0);

  const openAddModal = (preselectedType?: string) => {
    setEditingId(null);
    setFormError(null);
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormConsumable(preselectedType || balances[0]?.name || "Holo Patch");
    setFormQuantity("");
    setFormBatch("");
    setFormSupplier("DVLA Central Store");
    setFormRemarks("");
    setModalOpen(true);
  };

  const openEditModal = (rec: StockRecord) => {
    setEditingId(rec.id);
    setFormError(null);
    setFormDate(rec.date_received ? rec.date_received.slice(0, 10) : new Date().toISOString().split("T")[0]);
    setFormConsumable(rec.consumable_name);
    setFormQuantity(String(rec.quantity_added));
    setFormBatch(rec.batch_number || "");
    setFormSupplier(rec.supplier || "");
    setFormReceivedBy(rec.received_by || "");
    setFormRemarks(rec.remarks || "");
    setModalOpen(true);
  };

  const handleCreateNewType = async () => {
    const trimmed = newTypeName.trim();
    if (!trimmed) return;
    setSavingNewType(true);
    setFormError(null);
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
      await loadStocks();
      setFormConsumable(data.name || trimmed);
      setNewTypeName("");
      setAddingNewType(false);
      gooeyToast.success("Consumable Type Added", {
        description: `"${data.name || trimmed}" has been created and selected for stock entry.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create type.";
      setFormError(msg);
      gooeyToast.error("Could Not Add Type", { description: msg });
    } finally {
      setSavingNewType(false);
    }
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const qty = Number(formQuantity);
    if (!formConsumable) {
      setFormError("Please select a consumable type.");
      return;
    }
    if (!qty || qty <= 0) {
      setFormError("Quantity added must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const payload = {
        id: editingId ?? undefined,
        date_received: formDate,
        consumable_name: formConsumable,
        quantity_added: qty,
        batch_number: formBatch.trim() || null,
        supplier: formSupplier.trim() || null,
        received_by: formReceivedBy.trim() || "DVLA Store Officer",
        remarks: formRemarks.trim() || null,
      };

      const res = await fetch("/api/stocks", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save stock entry.");

      setModalOpen(false);
      await loadStocks();
      if (editingId) {
        gooeyToast.success("Stock Entry Updated", {
          description: `Updated ${formConsumable} stock batch (+${qty.toLocaleString()} units).`,
        });
      } else {
        gooeyToast.success("Consumable Stock Added", {
          description: `Added +${qty.toLocaleString()} ${formConsumable} (${data.reference_number || "New Batch"}) to store balance.`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving stock entry.";
      setFormError(msg);
      gooeyToast.error("Stock Save Failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteStock = async () => {
    if (!deleteTarget) return;
    const rec = deleteTarget;
    setDeletingId(rec.id);
    try {
      const res = await fetch(`/api/stocks?id=${rec.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete stock entry.");
      setDeleteTarget(null);
      await loadStocks();
      gooeyToast.success("Stock Entry Deleted", {
        description: `Deleted #${rec.reference_number} (${Number(rec.quantity_added).toLocaleString()} ${rec.consumable_name}) from store inventory.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting stock entry.";
      gooeyToast.error("Delete Failed", { description: msg });
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Clean Page Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Consumable Stocks
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Add incoming stock batches for consumable types and track live available store balances.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadStocks}
              className="h-9 gap-2 border-slate-200 text-slate-600 font-normal"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => openAddModal()}
              className="h-9 bg-dvla-green hover:bg-dvla-green-light text-white gap-2 font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Consumable Stock
            </Button>
          </div>
        </div>

        {/* 4 Spacious KPI Summary Cards */}
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-200/80 bg-white shadow-none py-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-medium">Total Stock Added</span>
                <PackagePlus className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-2xl font-semibold text-slate-900">
                {summary.overall_stock_added.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Across {summary.total_entries} stock receipt batches
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white shadow-none py-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-medium">Total Quantity Issued</span>
                <ArrowUpRight className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-semibold text-blue-700">
                {summary.overall_issued.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Issued out on Consumables Return Sheet
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white shadow-none py-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-medium">Available Store Balance</span>
                <Boxes className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-semibold text-emerald-700">
                {summary.overall_available.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Stock Added minus Quantity Issued
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white shadow-none py-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-slate-500 mb-3">
                <span className="text-xs font-medium">Active Consumable Types</span>
                <Package className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-2xl font-semibold text-slate-900">
                {balances.length}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Click any type card below to add stock
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Live Stock Balance by Consumable Type */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-medium text-slate-900">
                Stock Balance by Consumable Type
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Live balance comparing stock added against quantities issued on the Return Sheet.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {balances.map((item) => {
              const added = Number(item.total_stock_added || 0);
              const issued = Number(item.total_issued || 0);
              const avail = Number(item.available_stock || 0);
              const isLow = avail <= 15;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-lg border border-slate-200/80 bg-slate-50/40 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-medium text-slate-800 truncate">
                        {item.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-normal px-1.5 py-0 ${
                          isLow
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {avail.toLocaleString()} left
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Added</span>
                        <span className="font-medium text-slate-800">{added.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Issued</span>
                        <span className="font-medium text-blue-700">{issued.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Balance</span>
                        <span
                          className={`font-medium ${
                            avail < 0
                              ? "text-red-600"
                              : isLow
                              ? "text-amber-700"
                              : "text-emerald-700"
                          }`}
                        >
                          {avail.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAddModal(item.name)}
                    className="w-full h-7 text-[11px] font-normal border-slate-200 text-slate-700 hover:border-dvla-green hover:text-dvla-green gap-1 bg-white"
                  >
                    <Plus className="h-3 w-3" />
                    Add {item.name} Stock
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 flex flex-col lg:flex-row justify-between items-stretch lg:items-end gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-slate-500">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Batch no, supplier, officer, or type..."
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
                  {balances.map((b) => (
                    <SelectItem key={b.id} value={b.name}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-slate-500">From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-slate-50/70 border-slate-200 text-xs h-9 font-normal"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-slate-500">To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-slate-50/70 border-slate-200 text-xs h-9 font-normal"
              />
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-9 text-xs text-slate-500 hover:text-slate-800 gap-1.5 font-normal self-end"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>

        {/* Stock Additions Table with Static Total Row & 20/30/50/70 Pagination */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-dvla-green text-white border-b border-slate-200">
                  <th className="py-3 px-4 text-left font-medium border-r border-white/10 whitespace-nowrap">
                    Date Received
                  </th>
                  <th className="py-3 px-4 text-left font-medium border-r border-white/10 whitespace-nowrap">
                    Reference No.
                  </th>
                  <th className="py-3 px-4 text-left font-medium border-r border-white/10 whitespace-nowrap">
                    Consumable Type
                  </th>
                  <th className="py-3 px-4 text-center font-medium border-r border-white/10 whitespace-nowrap">
                    Quantity Added
                  </th>
                  <th className="py-3 px-4 text-left font-medium border-r border-white/10 whitespace-nowrap">
                    Batch / Waybill No.
                  </th>
                  <th className="py-3 px-4 text-left font-medium border-r border-white/10 whitespace-nowrap">
                    Supplier / Source
                  </th>
                  <th className="py-3 px-4 text-left font-medium border-r border-white/10 whitespace-nowrap">
                    Received By
                  </th>
                  <th className="py-3 px-4 text-left font-medium border-r border-white/10 whitespace-nowrap">
                    Remarks
                  </th>
                  <th className="py-3 px-4 text-center font-medium whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-dvla-green mb-1.5" />
                      Loading stock batches...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      No stock batches found. Click{" "}
                      <span className="font-medium text-slate-600">Add Consumable Stock</span> to record incoming stock.
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr key={rec.id} className="bg-white hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-600 border-r border-slate-100 whitespace-nowrap">
                        {formatShortDate(rec.date_received)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 border-r border-slate-100 whitespace-nowrap">
                        {rec.reference_number}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium border-r border-slate-100 whitespace-nowrap">
                        {rec.consumable_name}
                      </td>
                      <td className="py-3 px-4 text-center border-r border-slate-100 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                          +{Number(rec.quantity_added).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 border-r border-slate-100 whitespace-nowrap">
                        {rec.batch_number || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 border-r border-slate-100 whitespace-nowrap">
                        {rec.supplier || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-700 border-r border-slate-100 whitespace-nowrap">
                        {rec.received_by || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-500 border-r border-slate-100 max-w-[220px] truncate">
                        {rec.remarks || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-dvla-green hover:bg-slate-100"
                            title="Edit Stock Batch"
                            onClick={() => openEditModal(rec)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete Stock Batch"
                            disabled={deletingId === rec.id}
                            onClick={() => setDeleteTarget(rec)}
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
                  ))
                )}
              </tbody>

              {records.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-slate-50 shadow-[0_-1px_0_0_rgba(226,232,240,1)]">
                  <tr className="bg-slate-50 border-t-2 border-slate-200 font-medium text-slate-800">
                    <td className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                      Total (All Pages)
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-slate-500 font-normal whitespace-nowrap">
                      {summary.total_entries.toLocaleString()} batches
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200 text-slate-500 font-normal whitespace-nowrap">
                      Total Stock Added
                    </td>
                    <td className="py-3 px-4 text-center border-r border-slate-200 text-emerald-700">
                      +{summary.filtered_stock_added.toLocaleString()}
                    </td>
                    <td colSpan={5} />
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
                <span className="font-medium text-slate-800">{summary.total_entries}</span> batches
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

        {/* Add / Edit Stock Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <PackagePlus className="h-4 w-4 text-dvla-green" />
                {editingId ? "Edit Consumable Stock Entry" : "Add Consumable Stock"}
              </DialogTitle>
              <DialogDescription>
                Record incoming consumable stock quantities to update store balances.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveStock} className="space-y-4 py-2">
              {formError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">Date Received</Label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">Quantity Added</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 50"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-normal text-slate-500">Consumable Type</Label>
                  <button
                    type="button"
                    onClick={() => setAddingNewType(!addingNewType)}
                    className="text-xs text-dvla-green hover:underline font-medium flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    {addingNewType ? "Cancel new type" : "New consumable type"}
                  </button>
                </div>

                {addingNewType ? (
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      placeholder="Enter new consumable type name..."
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateNewType}
                      disabled={savingNewType || !newTypeName.trim()}
                      className="bg-dvla-green hover:bg-dvla-green-light text-white h-9 px-3 text-xs shrink-0"
                    >
                      {savingNewType ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add Type"}
                    </Button>
                  </div>
                ) : (
                  <Select value={formConsumable} onValueChange={setFormConsumable}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select consumable type" />
                    </SelectTrigger>
                    <SelectContent>
                      {balances.map((b) => (
                        <SelectItem key={b.id} value={b.name}>
                          {b.name} (Avail: {Number(b.available_stock || 0).toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">Batch / Waybill No.</Label>
                  <Input
                    placeholder="e.g. BATCH-HP-2608"
                    value={formBatch}
                    onChange={(e) => setFormBatch(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">Supplier / Source</Label>
                  <Input
                    placeholder="e.g. DVLA Central Store"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">Received By</Label>
                  <Input
                    placeholder="Officer name"
                    value={formReceivedBy}
                    onChange={(e) => setFormReceivedBy(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">Remarks / Notes</Label>
                  <Input
                    placeholder="Optional delivery note..."
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="font-normal"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-dvla-green hover:bg-dvla-green-light text-white font-medium gap-1.5"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {editingId ? "Save Changes" : "Add Stock"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Stock Entry Confirmation Modal */}
        <Dialog
          open={Boolean(deleteTarget)}
          onOpenChange={(isOpen) => {
            if (!isOpen && !deletingId) setDeleteTarget(null);
          }}
        >
          <DialogContent className="sm:max-w-md border-slate-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <span className="h-8 w-8 rounded-lg bg-red-50 border border-red-200/80 flex items-center justify-center text-red-600 shrink-0">
                  <Trash2 className="h-4 w-4" />
                </span>
                Delete Stock Entry
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 pt-1">
                {deleteTarget
                  ? `Delete stock entry #${deleteTarget.reference_number} (${Number(deleteTarget.quantity_added).toLocaleString()} ${deleteTarget.consumable_name})?`
                  : "Are you sure you want to delete this stock entry?"}
              </DialogDescription>
            </DialogHeader>

            {deleteTarget && (
              <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Reference No.</span>
                  <span className="font-medium text-slate-800">{deleteTarget.reference_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Consumable Type</span>
                  <span className="font-medium text-slate-800">{deleteTarget.consumable_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Quantity Added</span>
                  <span className="font-medium text-emerald-700">
                    +{Number(deleteTarget.quantity_added).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Date Received</span>
                  <span className="text-slate-700">{formatShortDate(deleteTarget.date_received)}</span>
                </div>
                {deleteTarget.batch_number && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Batch / Waybill</span>
                    <span className="text-slate-700">{deleteTarget.batch_number}</span>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={Boolean(deletingId)}
                onClick={() => setDeleteTarget(null)}
                className="font-normal text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={confirmDeleteStock}
                className="bg-red-600 hover:bg-red-700 text-white font-medium text-xs h-9 gap-1.5"
              >
                {deletingId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete Stock Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

