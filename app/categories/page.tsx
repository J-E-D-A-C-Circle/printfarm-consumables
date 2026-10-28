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
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Download, RefreshCw, Loader2, ArrowUpRight, FileSignature, Trash2, ChevronLeft, ChevronRight, PackageOpen, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { IssueStockModal } from "@/components/IssueStockModal";
import { ReconciliationModal } from "@/components/ReconciliationModal";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

interface StockIssueRecord {
  id: number;
  reference_number: string;
  requisition_number: string | null;
  consumable_id: number;
  item_name: string;
  item_code: string;
  unit: string;
  category: string;
  quantity: number;
  expected_quantity?: number;
  to_station: string | null;
  from_station: string | null;
  department: string | null;
  purpose: string;
  receiving_officer: string | null;
  date_issued: string;
  balance_after: number | null;
  remarks: string | null;
  batch_id: number | null;
}

interface Category {
  id: number;
  name: string;
  code_prefix?: string;
  item_count?: number;
}

function CategoriesContent() {
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryFilter || "all");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalItems, setTotalItems] = useState(0);

  const [issues, setIssues] = useState<StockIssueRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Manage Consumable Types Modal State
  const [manageTypesOpen, setManageTypesOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<number | null>(null);
  const [typeMsg, setTypeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync state if category param in URL changes
  useEffect(() => {
    if (categoryFilter) {
      setSelectedCategory(categoryFilter);
    } else {
      setSelectedCategory("all");
    }
    setCurrentPage(1);
  }, [categoryFilter]);

  const loadIssuedRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      params.set("page", String(currentPage));
      params.set("limit", String(pageSize));

      const [issuesRes, catsRes] = await Promise.all([
        fetch(`/api/issues?${params.toString()}`),
        fetch("/api/categories"),
      ]);

      if (issuesRes.ok) {
        const d = await issuesRes.json();
        setIssues(d.data || []);
        setTotalItems(d.total || 0);
      }
      if (catsRes.ok) {
        const d = await catsRes.json();
        setCategories(d.data || []);
      }
    } catch (err) {
      console.error("Failed to load category dispatch issues:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, currentPage, pageSize]);

  useEffect(() => {
    loadIssuedRecords();
  }, [loadIssuedRecords]);

  const handleDeleteDispatch = async (rec: StockIssueRecord) => {
    if (!confirm(`Are you sure you want to delete dispatch reference "${rec.reference_number}"? This will restore ${rec.quantity} ${rec.unit}(s) back to inventory balance.`)) {
      return;
    }
    setDeletingId(rec.id);
    try {
      const res = await fetch(`/api/issues?id=${rec.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete dispatch record.");
      await loadIssuedRecords();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting dispatch record.");
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
          code_prefix: trimmed.slice(0, 3).toUpperCase(),
          purpose: "standard",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add consumable type.");
      setTypeMsg({ type: "success", text: `Consumable type "${trimmed}" created successfully!` });
      setNewCatName("");
      await loadIssuedRecords();
    } catch (err: unknown) {
      setTypeMsg({ type: "error", text: err instanceof Error ? err.message : "Error creating category." });
    } finally {
      setAddingCat(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`Are you sure you want to delete consumable type "${cat.name}"?`)) return;
    setTypeMsg(null);
    setDeletingCatId(cat.id);
    try {
      const res = await fetch("/api/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, name: cat.name }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          const proceed = confirm(
            `${data.error}\n\nDo you want to archive all linked consumable items and delete consumable type "${cat.name}"?`
          );
          if (proceed) {
            const forceRes = await fetch("/api/categories", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: cat.id, name: cat.name, force: true }),
            });
            const forceData = await forceRes.json();
            if (!forceRes.ok) throw new Error(forceData.error || `Cannot delete "${cat.name}".`);
            setTypeMsg({ type: "success", text: `Consumable type "${cat.name}" and linked items archived.` });
            await loadIssuedRecords();
            return;
          }
          return;
        }
        throw new Error(data.error || `Cannot delete "${cat.name}".`);
      }
      setTypeMsg({ type: "success", text: `Consumable type "${cat.name}" deleted successfully.` });
      await loadIssuedRecords();
    } catch (err: unknown) {
      setTypeMsg({ type: "error", text: err instanceof Error ? err.message : `Cannot delete "${cat.name}".` });
    } finally {
      setDeletingCatId(null);
    }
  };

  const handleExport = () => {
    if (issues.length === 0) {
      alert("No dispatch records available to export. All records have been deleted or none exist.");
      return;
    }

    const data = issues.map((rec, i) => ({

      "No.": i + 1,
      "Date Issued": rec.date_issued ? rec.date_issued.slice(0, 10) : "",
      "Reference #": rec.reference_number,
      "Item Code": rec.item_code,
      "Consumable Item": rec.item_name,
      Category: rec.category,
      "Issued Qty": rec.quantity,
      Unit: rec.unit,
      "Target Station": rec.to_station || "Head Office",
      Department: rec.department || "General Store",
      "Receiving Officer": rec.receiving_officer || "—",
      Purpose: rec.purpose,
      "Balance After": rec.balance_after !== null ? rec.balance_after : "—",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Category Dispatches");
    XLSX.writeFile(wb, `DVLA_Category_Dispatch_Logs_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Category Dispatch Register</h1>
            <p className="text-sm text-slate-500">
              Audit log of all stock issued and dispatched across category lines.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => { setManageTypesOpen(true); setTypeMsg(null); }}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-slate-300 text-slate-700 hover:text-slate-900"
            >
              <PackageOpen className="h-4 w-4 text-dvla-green" />
              Manage Consumable Types
            </Button>
            <Button onClick={handleExport} variant="outline" size="sm" className="h-9 gap-1.5 border-slate-300 text-slate-700">
              <Download className="h-4 w-4" />
              Export Issued Logs
            </Button>
            <IssueStockModal
              defaultCategory={selectedCategory !== "all" ? selectedCategory : undefined}
              onSuccess={loadIssuedRecords}
            >
              <Button size="sm" className="h-9 gap-1.5 bg-dvla-gold hover:bg-dvla-gold-hover text-slate-900 font-semibold shadow-sm">
                <ArrowUpRight className="h-4 w-4" />
                Issue Stock
              </Button>
            </IssueStockModal>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by reference, item, officer..."
                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px] bg-slate-50 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={loadIssuedRecords}
              title="Refresh dispatch table"
              className="h-9 w-9 text-slate-600 hover:text-slate-900"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            {(searchTerm || selectedCategory !== "all") && (
              <Button
                variant="ghost"
                className="text-slate-500 hover:text-slate-900 text-xs"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Data Table of ALL Issued Instances */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="font-bold text-slate-700">Date Issued</TableHead>
                  <TableHead className="font-bold text-slate-700">Reference #</TableHead>
                  <TableHead className="font-bold text-slate-700">Consumable Item</TableHead>
                  <TableHead className="font-bold text-slate-700">Category</TableHead>
                  <TableHead className="font-bold text-slate-700">Target Station</TableHead>
                  <TableHead className="font-bold text-slate-700">Department</TableHead>
                  <TableHead className="font-bold text-slate-700">Receiving Officer</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Issued Qty</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Expected Cards</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Balance After</TableHead>
                  <TableHead className="text-center font-bold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-slate-500">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-dvla-green" />
                        <span>Loading category dispatch instances...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : issues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-slate-500">
                      No stock issue records found for the selected category filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  issues.map((rec) => (
                    <TableRow key={rec.id} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                        {rec.date_issued ? rec.date_issued.slice(0, 10) : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-slate-800">
                        {rec.reference_number}
                      </TableCell>
                      <TableCell>
                        <Link href={`/consumables/${rec.consumable_id}`} className="hover:underline">
                          <div className="font-semibold text-slate-900">{rec.item_name}</div>
                          <div className="text-[11px] font-mono text-slate-500">{rec.item_code}</div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          {rec.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {rec.to_station || "Head Office"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {rec.department || "General Store"}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-800">
                        {rec.receiving_officer || "—"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-amber-600 text-sm">
                        -{rec.quantity} <span className="text-[10px] text-slate-400 font-normal">{rec.unit}s</span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-700 text-sm">
                        {rec.expected_quantity || rec.quantity} <span className="text-[10px] text-slate-400 font-normal">cards</span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {rec.balance_after !== null ? (
                          <span className="text-base font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 inline-block shadow-xs">
                            {rec.balance_after}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Reconciliation Action Icon Button */}
                          <ReconciliationModal
                            item={{ id: rec.consumable_id, name: rec.item_name, item_code: rec.item_code }}
                            issueRecord={rec}
                            onSuccess={loadIssuedRecords}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              title={`Reconcile dispatch #${rec.reference_number} / Track yield`}
                            >
                              <FileSignature className="h-4 w-4" />
                            </Button>
                          </ReconciliationModal>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title={`Delete dispatch record #${rec.reference_number}`}
                            disabled={deletingId === rec.id}
                            onClick={() => handleDeleteDispatch(rec)}
                          >
                            {deletingId === rec.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Full Pagination Bar */}
          <div className="p-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 bg-slate-50/50 gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Show</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px] bg-white text-xs font-semibold border-slate-300">
                    <SelectValue placeholder="15" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="75">75</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-slate-500">entries per page</span>
              </div>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <div className="text-slate-600">
                Showing <span className="font-bold text-slate-800">{totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{" "}
                <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, totalItems)}</span> of{" "}
                <span className="font-bold text-slate-800">{totalItems}</span> dispatches
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs border-slate-300 font-medium"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              
              <span className="px-2 font-semibold text-slate-700 text-xs">
                Page {currentPage} of {Math.max(1, Math.ceil(totalItems / pageSize))}
              </span>

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs border-slate-300 font-medium"
                disabled={currentPage >= Math.ceil(totalItems / pageSize) || loading}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Modal: Manage Consumable Types */}
        <Dialog open={manageTypesOpen} onOpenChange={setManageTypesOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <PackageOpen className="h-5 w-5 text-dvla-green" />
                Manage Consumable Types
              </DialogTitle>
              <DialogDescription>
                Add new consumable types or delete unused types from the system.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {typeMsg && (
                <div
                  className={`flex items-start gap-2 p-3 rounded-lg text-xs font-medium ${
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
                  <span className="leading-relaxed">{typeMsg.text}</span>
                </div>
              )}

              {/* Add New Consumable Type */}
              <div className="flex items-end gap-2">
                <div className="space-y-1.5 flex-1">
                  <Label htmlFor="typeInput" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    New Type Name
                  </Label>
                  <Input
                    id="typeInput"
                    placeholder="e.g. Laminating Pouches"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCategory())}
                    disabled={addingCat}
                    className="h-9 text-xs"
                  />
                </div>
                <Button
                  onClick={handleAddCategory}
                  disabled={addingCat || !newCatName.trim()}
                  className="bg-dvla-green hover:bg-dvla-green-light text-white h-9 shrink-0 font-semibold gap-1 text-xs"
                >
                  {addingCat ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add Type
                </Button>
              </div>

              {/* Active Consumable Types List */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Active Consumable Types ({categories.length})
                </Label>
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{cat.name}</span>
                        {cat.code_prefix && (
                          <Badge variant="outline" className="bg-slate-50 font-mono text-[10px] text-slate-500">
                            {cat.code_prefix}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] font-normal text-slate-600 bg-slate-100">
                          {cat.item_count ? `${cat.item_count} items` : "0 items"}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title={`Delete consumable type "${cat.name}"`}
                        disabled={deletingCatId === cat.id}
                        onClick={() => handleDeleteCategory(cat)}
                      >
                        {deletingCatId === cat.id ? (
                          <Loader2 className="h-3 w-3 animate-spin text-red-500" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500">No consumable types found.</div>
                  )}
                </div>
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
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <CategoriesContent />
    </Suspense>
  );
}
