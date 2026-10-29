"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  Loader2,
  Plus,
  Send,
  Edit3,
  ArrowRight,
  CheckSquare,
} from "lucide-react";
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
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { IssueStockModal } from "@/components/IssueStockModal";
import { ReconciliationModal, ReturnSheetRecord } from "@/components/ReconciliationModal";

interface CategorySummary {
  id: number;
  name: string;
  code_prefix?: string;
  request_count: number;
  total_requested: number;
  total_issued: number;
  total_consumption: number;
}

interface DashboardSummary {
  total_requests: number;
  pending_issue: number;
  issued_pending_return: number;
  completed: number;
  total_requested_qty: number;
  total_issued_qty: number;
  total_consumption: number;
}

function formatShortDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  const clean = dateStr.slice(0, 10);
  const parts = clean.split("-");
  if (parts.length !== 3) return clean;
  return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
}

export default function Dashboard() {
  const [records, setRecords] = useState<ReturnSheetRecord[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({
    total_requests: 0,
    pending_issue: 0,
    issued_pending_return: 0,
    completed: 0,
    total_requested_qty: 0,
    total_issued_qty: 0,
    total_consumption: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [issRes, catRes] = await Promise.all([
        fetch("/api/issues?limit=15", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);
      if (issRes.ok) {
        const d = await issRes.json();
        setRecords(d.data || []);
        if (d.summary) setSummary(d.summary);
      }
      if (catRes.ok) {
        const d = await catRes.json();
        setCategories(d.data || []);
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Clean Page Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Overview of consumable requests, issued quantities, and production consumption.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <IssueStockModal defaultMode="request" onSuccess={loadDashboard}>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-slate-200 text-slate-600 font-normal"
              >
                <Plus className="h-4 w-4 text-amber-500" />
                Make Request
              </Button>
            </IssueStockModal>
            <IssueStockModal defaultMode="issue" onSuccess={loadDashboard}>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-slate-200 text-slate-600 font-normal"
              >
                <Send className="h-4 w-4 text-blue-600" />
                Request & Issue
              </Button>
            </IssueStockModal>
            <IssueStockModal defaultMode="complete" onSuccess={loadDashboard}>
              <Button
                size="sm"
                className="h-9 gap-2 bg-dvla-green hover:bg-dvla-green-light text-white font-medium"
              >
                <FileSpreadsheet className="h-4 w-4 text-dvla-gold" />
                New Return Entry
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
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                ) : (
                  summary.total_requested_qty.toLocaleString()
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Across {summary.total_requests} total requests
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
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                ) : (
                  summary.total_issued_qty.toLocaleString()
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {summary.pending_issue > 0
                  ? `${summary.pending_issue} awaiting issuance`
                  : "All requested consumables issued"}
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
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                ) : (
                  summary.issued_pending_return
                )}
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
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                ) : (
                  summary.total_consumption.toLocaleString()
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Recorded from {summary.completed} completed returns
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown by Consumable Type */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700">
              Consumable Types Summary
            </h2>
            <Link
              href="/categories"
              className="text-xs font-normal text-dvla-green hover:underline flex items-center gap-1"
            >
              Open Consumables Return Sheet <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories?category=${encodeURIComponent(cat.name)}`}
                className="bg-white p-4 rounded-xl border border-slate-200/80 hover:border-dvla-green transition-colors group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-slate-800 text-xs group-hover:text-dvla-green">
                    {cat.name}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {cat.request_count} req
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Req</span>
                    <span className="text-slate-700 font-medium">
                      {Number(cat.total_requested || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Issued</span>
                    <span className="text-blue-700 font-medium">
                      {Number(cat.total_issued || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[11px] block">Consumption</span>
                    <span className="text-emerald-700 font-medium">
                      {Number(cat.total_consumption || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Return Sheet Activity */}
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-medium text-slate-900">
                Recent Requests & Production Returns
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Issue requested consumables or record production consumption.
              </p>
            </div>
            <Link href="/categories">
              <Button variant="outline" size="sm" className="text-xs h-8 font-normal border-slate-200">
                View All Records
              </Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70">
                  <TableHead className="font-medium text-slate-600 py-3 px-4">Date Requested</TableHead>
                  <TableHead className="font-medium text-slate-600 py-3 px-4">Consumable Type</TableHead>
                  <TableHead className="text-center font-medium text-slate-600 py-3 px-4">
                    Qty Requested
                  </TableHead>
                  <TableHead className="text-center font-medium text-slate-600 py-3 px-4">
                    Qty Issued
                  </TableHead>
                  <TableHead className="font-medium text-slate-600 py-3 px-4">Requested By</TableHead>
                  <TableHead className="font-medium text-slate-600 py-3 px-4">Received By</TableHead>
                  <TableHead className="text-center font-medium text-slate-600 py-3 px-4">
                    Date Returned
                  </TableHead>
                  <TableHead className="text-right font-medium text-slate-600 py-3 px-4">
                    Total Consumption
                  </TableHead>
                  <TableHead className="text-right font-medium text-slate-600 py-3 px-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-dvla-green mb-1" />
                      Loading records...
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                      No consumable requests recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.slice(0, 10).map((r) => {
                    const reqQ = Number(r.quantity_requested ?? 0);
                    const issQ =
                      r.quantity_issued !== null && r.quantity_issued !== undefined
                        ? Number(r.quantity_issued)
                        : null;
                    const diff = issQ !== null ? issQ - reqQ : 0;

                    return (
                      <TableRow key={r.id} className="hover:bg-slate-50/70 border-b border-slate-100">
                        <TableCell className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                          {formatShortDate(r.date_requested)}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-xs font-medium text-slate-800 whitespace-nowrap">
                          {r.consumable_name || r.category}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center text-xs text-slate-700">
                          {reqQ}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center text-xs">
                          {issQ !== null ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="font-medium text-blue-700">{issQ}</span>
                              {diff !== 0 && (
                                <span
                                  className={`text-[10px] px-1 rounded ${
                                    diff < 0
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-blue-50 text-blue-700"
                                  }`}
                                >
                                  {diff > 0 ? `+${diff}` : diff}
                                </span>
                              )}
                            </span>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-normal"
                            >
                              Pending Issue
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-xs text-slate-700">
                          {r.requested_by || "—"}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-xs text-slate-600">
                          {r.received_by || "—"}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center text-xs text-slate-600">
                          {formatShortDate(r.date_returned)}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right text-xs">
                          {r.total_consumption !== null && r.total_consumption !== undefined ? (
                            <span className="font-medium text-emerald-700">
                              {Number(r.total_consumption).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs text-amber-600">Pending</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right">
                          <ReconciliationModal
                            issueRecord={r}
                            initialMode={
                              r.status === "Pending Issue"
                                ? "issue"
                                : r.status === "Issued"
                                ? "return"
                                : "edit"
                            }
                            onSuccess={loadDashboard}
                          >
                            {r.status === "Pending Issue" ? (
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-normal gap-1"
                              >
                                <Send className="h-3 w-3" /> Issue
                              </Button>
                            ) : r.status === "Issued" ? (
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-normal gap-1"
                              >
                                <TrendingUp className="h-3 w-3" /> Record Consumption
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs font-normal border-slate-200 gap-1"
                              >
                                <Edit3 className="h-3 w-3" /> Edit
                              </Button>
                            )}
                          </ReconciliationModal>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
