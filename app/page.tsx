"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ArrowRightLeft, AlertTriangle, ArrowUpRight, ArrowDownLeft, CheckCircle2, Loader2, Plus, FileSpreadsheet } from "lucide-react";
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
import { useState, useEffect } from "react";
import { IssueStockModal } from "@/components/IssueStockModal";
import { ReceiveStockModal } from "@/components/ReceiveStockModal";

interface Consumable {
  id: number;
  item_code: string;
  name: string;
  category: string;
  balance: number;
  status: string;
  unit: string;
}

interface Movement {
  id: number;
  movement_type: "receipt" | "issue" | "adjustment";
  movement_date: string;
  item_name: string;
  reference: string;
  quantity: number;
  unit: string;
  officer: string | null;
}

export default function Dashboard() {
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [consRes, movRes] = await Promise.all([
          fetch("/api/consumables?limit=200"),
          fetch("/api/movements?limit=10"),
        ]);
        if (consRes.ok) {
          const d = await consRes.json();
          setConsumables(d.data || []);
        }
        if (movRes.ok) {
          const d = await movRes.json();
          setMovements(d.data || []);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const totalItems = consumables.length;
  const totalStock = consumables.reduce((acc: number, curr: Consumable) => acc + (Number(curr.balance) || 0), 0);
  const lowStockItems = consumables.filter((c: Consumable) => c.status === "LOW STOCK");
  const outOfStockItems = consumables.filter((c: Consumable) => c.status === "OUT OF STOCK");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">DVLA Consumables Dashboard</h1>
            <p className="text-sm text-slate-500">Live operational stock overview, issuance metrics, and recent activities.</p>
          </div>
          <div className="flex items-center gap-2">
            <ReceiveStockModal>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 border-slate-300 text-slate-700">
                <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                Receive Stock
              </Button>
            </ReceiveStockModal>
            <IssueStockModal>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 border-slate-300 text-slate-700">
                <ArrowUpRight className="h-4 w-4 text-amber-600" />
                Issue Stock
              </Button>
            </IssueStockModal>
            <Link href="/reports">
              <Button size="sm" className="h-9 gap-1.5 bg-dvla-green hover:bg-dvla-green-light text-white font-medium shadow-sm">
                <FileSpreadsheet className="h-4 w-4 text-dvla-gold" />
                Work Done Reports
              </Button>
            </Link>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-dvla-green shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Consumables</CardTitle>
              <Package className="h-4 w-4 text-dvla-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900">
                {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : totalItems}
              </div>
              <p className="text-xs text-slate-500 mt-1">Active items registered in database</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-dvla-gold shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Stock Balance</CardTitle>
              <Package className="h-4 w-4 text-dvla-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900">
                {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : totalStock.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">Available units currently in stock</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">Low Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-amber-600">
                {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : lowStockItems.length}
              </div>
              <p className="text-xs text-slate-500 mt-1">Items at or below reorder threshold</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600">Out of Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-red-600">
                {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : outOfStockItems.length}
              </div>
              <p className="text-xs text-slate-500 mt-1">Critical stock requiring immediate requisition</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions & Movements */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Stock Movements</h2>
              <p className="text-xs text-slate-500">Live feed of latest inventory receipts and issuances.</p>
            </div>
            <Link href="/movements">
              <Button variant="outline" size="sm" className="text-xs h-8">
                View All Movements
              </Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="font-bold text-slate-700">Date</TableHead>
                  <TableHead className="font-bold text-slate-700">Type</TableHead>
                  <TableHead className="font-bold text-slate-700">Reference #</TableHead>
                  <TableHead className="font-bold text-slate-700">Consumable Item</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Quantity</TableHead>
                  <TableHead className="font-bold text-slate-700">Officer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-dvla-green mb-1" />
                      Loading live dashboard...
                    </TableCell>
                  </TableRow>
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No stock movements recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.slice(0, 6).map((m: Movement, i: number) => (
                    <TableRow key={`${m.id}-${i}`} className="hover:bg-slate-50/60 border-b border-slate-100">
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                        {m.movement_date ? m.movement_date.slice(0, 10) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            m.movement_type === "receipt"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }
                        >
                          {m.movement_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-slate-700">
                        {m.reference}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900 text-sm">
                        {m.item_name}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900 text-sm">
                        {m.movement_type === "receipt" ? `+${m.quantity}` : `-${m.quantity}`} {m.unit}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {m.officer || "System"}
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
