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
import { Search, Filter, Plus, ArrowUpRight, ArrowDownLeft, Trash2, Eye, RefreshCw, Loader2 } from "lucide-react";
import { IssueStockModal } from "@/components/IssueStockModal";
import { ReceiveStockModal } from "@/components/ReceiveStockModal";
import { AddConsumableModal } from "@/components/AddConsumableModal";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useCallback } from "react";

interface Consumable {
  id: number;
  item_code: string;
  name: string;
  description: string | null;
  category: string;
  category_id: number;
  station: string | null;
  department: string | null;
  unit: string;
  received: number;
  issued: number;
  balance: number;
  reorder_level: number;
  status: "IN STOCK" | "LOW STOCK" | "OUT OF STOCK";
}

interface Category {
  id: number;
  name: string;
}

interface Station {
  id: number;
  name: string;
}

function ConsumablesContent() {
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category");

  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryFilter || "all");
  const [selectedStation, setSelectedStation] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [viewingItem, setViewingItem] = useState<Consumable | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchConsumables = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedStation !== "all") params.set("station", selectedStation);
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      params.set("limit", "100");

      const res = await fetch(`/api/consumables?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setConsumables(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load consumables:", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, selectedStation, selectedStatus]);

  useEffect(() => {
    async function loadLookups() {
      try {
        const [catsRes, statsRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/stations"),
        ]);
        if (catsRes.ok) {
          const catsData = await catsRes.json();
          setCategories(catsData.data || []);
        }
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStations(statsData.data || []);
        }
      } catch (err) {
        console.error("Failed to load lookups:", err);
      }
    }
    loadLookups();
  }, []);

  useEffect(() => {
    fetchConsumables();
  }, [fetchConsumables]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to archive consumable "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/consumables/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchConsumables();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to delete item.");
      }
    } catch {
      alert("Error deleting item.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Consumables Inventory</h1>
            <p className="text-sm text-slate-500">Live stock register across all DVLA stations and departments.</p>
          </div>
          <div className="flex items-center gap-2">
            <ReceiveStockModal onSuccess={fetchConsumables}>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 border-slate-300 text-slate-700">
                <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                Receive Stock
              </Button>
            </ReceiveStockModal>
            <IssueStockModal onSuccess={fetchConsumables}>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 border-slate-300 text-slate-700">
                <ArrowUpRight className="h-4 w-4 text-amber-600" />
                Issue Stock
              </Button>
            </IssueStockModal>
            <AddConsumableModal onSuccess={fetchConsumables}>
              <Button size="sm" className="h-9 gap-1.5 bg-dvla-green hover:bg-dvla-green-light text-white font-medium shadow-sm">
                <Plus className="h-4 w-4" />
                Add Consumable
              </Button>
            </AddConsumableModal>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by code, item name, or category..."
              className="pl-9 bg-slate-50 border-slate-200 focus:bg-white text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[160px] bg-slate-50 text-xs">
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

            <Select value={selectedStation} onValueChange={setSelectedStation}>
              <SelectTrigger className="w-[160px] bg-slate-50 text-xs">
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

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px] bg-slate-50 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="IN STOCK">IN STOCK</SelectItem>
                <SelectItem value="LOW STOCK">LOW STOCK</SelectItem>
                <SelectItem value="OUT OF STOCK">OUT OF STOCK</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={fetchConsumables}
              title="Refresh table"
              className="h-9 w-9 text-slate-600 hover:text-slate-900"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="w-[110px] font-bold text-slate-700">Item Code</TableHead>
                  <TableHead className="font-bold text-slate-700">Consumable Item</TableHead>
                  <TableHead className="font-bold text-slate-700">Category</TableHead>
                  <TableHead className="font-bold text-slate-700">Station / Dept</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Received</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Issued</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Current Balance</TableHead>
                  <TableHead className="font-bold text-slate-700">Status</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-dvla-green" />
                        <span>Loading live consumable stock...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : consumables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                      No consumables found matching your search.{" "}
                      <Link href="/consumables/add" className="text-dvla-green font-semibold hover:underline">
                        Add a new consumable now
                      </Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  consumables.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold text-slate-700">
                        {item.item_code}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        {item.description && (
                          <div className="text-[11px] text-slate-500 line-clamp-1">{item.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          {item.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        <div>{item.station || "Head Office"}</div>
                        {item.department && <div className="text-slate-400">{item.department}</div>}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-700">
                        {item.received.toLocaleString()} <span className="text-[10px] text-slate-400">{item.unit}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-700">
                        {item.issued.toLocaleString()} <span className="text-[10px] text-slate-400">{item.unit}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-base font-extrabold text-slate-900">
                          {item.balance.toLocaleString()}
                        </span>{" "}
                        <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            item.status === "IN STOCK"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold"
                              : item.status === "LOW STOCK"
                              ? "bg-amber-50 text-amber-700 border-amber-200 font-semibold animate-pulse"
                              : "bg-red-50 text-red-700 border-red-200 font-semibold"
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-dvla-green hover:bg-emerald-50"
                            title="View details"
                            onClick={() => setViewingItem(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <IssueStockModal defaultItemCode={item.id} defaultCategory={item.category} onSuccess={fetchConsumables}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                              title="Issue this item"
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                          </IssueStockModal>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Archive consumable"
                            disabled={deletingId === item.id}
                            onClick={() => handleDelete(item.id, item.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="p-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <div>
              Showing <span className="font-bold text-slate-800">{consumables.length}</span> consumable items in system
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Live database sync</span>
            </div>
          </div>
        </div>

        {/* View Modal */}
        {viewingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <span className="text-xs font-mono font-bold text-dvla-green uppercase px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                    {viewingItem.item_code}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{viewingItem.name}</h3>
                </div>
                <button
                  onClick={() => setViewingItem(null)}
                  className="text-slate-400 hover:text-slate-700 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <span className="text-xs text-slate-500">Category</span>
                  <p className="font-semibold text-slate-800">{viewingItem.category}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <span className="text-xs text-slate-500">Unit of Measure</span>
                  <p className="font-semibold text-slate-800">{viewingItem.unit}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <span className="text-xs text-slate-500">Current Balance</span>
                  <p className="text-xl font-bold text-slate-900">
                    {viewingItem.balance} {viewingItem.unit}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border">
                  <span className="text-xs text-slate-500">Reorder Alert Level</span>
                  <p className="text-xl font-bold text-amber-600">{viewingItem.reorder_level}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border col-span-2">
                  <span className="text-xs text-slate-500">Location</span>
                  <p className="font-medium text-slate-800">
                    {viewingItem.station || "Head Office"} {viewingItem.department ? `— ${viewingItem.department}` : ""}
                  </p>
                </div>
                {viewingItem.description && (
                  <div className="bg-slate-50 p-3 rounded-lg border col-span-2">
                    <span className="text-xs text-slate-500">Description / Specs</span>
                    <p className="text-xs text-slate-700 mt-0.5">{viewingItem.description}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <IssueStockModal defaultItemCode={viewingItem.id} defaultCategory={viewingItem.category} onSuccess={fetchConsumables}>
                  <Button className="bg-dvla-gold hover:bg-dvla-gold-hover text-slate-900 font-semibold text-xs">
                    Issue Stock
                  </Button>
                </IssueStockModal>
                <Button variant="outline" onClick={() => setViewingItem(null)} className="text-xs">
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function ConsumablesRecords() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <ConsumablesContent />
    </Suspense>
  );
}
