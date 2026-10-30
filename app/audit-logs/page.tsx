"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Database,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Activity,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AuditLogEntry {
  id: number;
  user_id: number | null;
  user_name: string | null;
  action: string;
  table_name: string | null;
  record_id: number | null;
  old_values: unknown;
  new_values: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedTable, setSelectedTable] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Options
  const [actionsList, setActionsList] = useState<string[]>([]);
  const [tablesList, setTablesList] = useState<string[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  // Detail Modal
  const [activeLog, setActiveLog] = useState<AuditLogEntry | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedAction !== "all") params.set("action", selectedAction);
      if (selectedTable !== "all") params.set("tableName", selectedTable);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      params.set("page", String(currentPage));
      params.set("limit", String(pageSize));

      const res = await fetch(`/api/audit-logs?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
        setTotal(data.total || 0);
        if (data.actions) setActionsList(data.actions);
        if (data.tables) setTablesList(data.tables);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedAction, selectedTable, dateFrom, dateTo, currentPage, pageSize]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startRow = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, total);

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("DELETE")) {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-medium text-[11px]">
          {action}
        </Badge>
      );
    }
    if (act.includes("CREATE") || act.includes("ADD")) {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium text-[11px]">
          {action}
        </Badge>
      );
    }
    if (act.includes("ISSUE") || act.includes("BATCH")) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium text-[11px]">
          {action}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-normal text-[11px]">
        {action}
      </Badge>
    );
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-dvla-green/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-dvla-green" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                System Audit Logs
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Full immutable trail of system events, user actions, batch operations, and modifications.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs()}
              disabled={loading}
              className="h-9 text-xs border-slate-200 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-slate-200/80 shadow-none">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search user, action, table, or IP..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 h-9 text-xs bg-slate-50/50 border-slate-200"
                />
              </div>

              <div>
                <select
                  value={selectedAction}
                  onChange={(e) => {
                    setSelectedAction(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 rounded-md border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-dvla-green/20"
                >
                  <option value="all">All Actions ({actionsList.length})</option>
                  {actionsList.map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedTable}
                  onChange={(e) => {
                    setSelectedTable(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 rounded-md border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-dvla-green/20"
                >
                  <option value="all">All Tables ({tablesList.length})</option>
                  {tablesList.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 text-xs bg-slate-50/50 border-slate-200"
                  title="From Date"
                />
                <span className="text-slate-400 text-xs">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 text-xs bg-slate-50/50 border-slate-200"
                  title="To Date"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">Timestamp</th>
                  <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">User</th>
                  <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">Action</th>
                  <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">Target Table</th>
                  <th className="py-3 px-4 border-r border-slate-200 text-center whitespace-nowrap">Record ID</th>
                  <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">IP Address</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto text-dvla-green mb-2" />
                      Loading audit logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No audit log entries found matching criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 border-r border-slate-100 whitespace-nowrap font-mono text-[11px]">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-100 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-800">{log.user_name || "System"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-100 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="py-3 px-4 text-slate-700 border-r border-slate-100 whitespace-nowrap font-mono text-[11px]">
                        {log.table_name || "—"}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 border-r border-slate-100 whitespace-nowrap font-mono text-[11px]">
                        {log.record_id ? `#${log.record_id}` : "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-500 border-r border-slate-100 whitespace-nowrap font-mono text-[11px]">
                        {log.ip_address || "—"}
                      </td>
                      <td className="py-2 px-4 text-center whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveLog(log)}
                          className="h-7 px-2.5 text-xs text-slate-600 hover:text-dvla-green hover:bg-emerald-50 gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
                  {[20, 30, 50, 70, 100].map((size) => (
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
                <span className="font-medium text-slate-800">{total}</span> events
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
              <span className="px-2 text-xs font-medium text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
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

        {/* Detail Inspection Modal */}
        {activeLog && (
          <Dialog open={Boolean(activeLog)} onOpenChange={(open) => !open && setActiveLog(null)}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-dvla-green" />
                  Audit Log Event #{activeLog.id}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Recorded at {formatDateTime(activeLog.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[11px]">User</span>
                    <span className="font-medium text-slate-800 mt-0.5 block">
                      {activeLog.user_name || "System"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Action</span>
                    <div className="mt-0.5">{getActionBadge(activeLog.action)}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Target Table</span>
                    <span className="font-medium text-slate-800 font-mono mt-0.5 block">
                      {activeLog.table_name || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Record ID</span>
                    <span className="font-medium text-slate-800 font-mono mt-0.5 block">
                      {activeLog.record_id ? `#${activeLog.record_id}` : "—"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Client IP</span>
                    <span className="font-mono text-slate-700">{activeLog.ip_address || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">User Agent</span>
                    <span className="text-slate-600 truncate block text-[11px]" title={activeLog.user_agent || ""}>
                      {activeLog.user_agent || "—"}
                    </span>
                  </div>
                </div>

                {activeLog.old_values != null && (
                  <div className="space-y-1">
                    <span className="font-medium text-slate-700 block">Previous Values (Before Change):</span>
                    <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto max-h-48">
                      {String(
                        typeof activeLog.old_values === "string"
                          ? activeLog.old_values
                          : JSON.stringify(activeLog.old_values, null, 2)
                      )}
                    </pre>
                  </div>
                )}

                {activeLog.new_values != null && (
                  <div className="space-y-1">
                    <span className="font-medium text-slate-700 block">New Values / Modified State:</span>
                    <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto max-h-48">
                      {String(
                        typeof activeLog.new_values === "string"
                          ? activeLog.new_values
                          : JSON.stringify(activeLog.new_values, null, 2)
                      )}
                    </pre>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
