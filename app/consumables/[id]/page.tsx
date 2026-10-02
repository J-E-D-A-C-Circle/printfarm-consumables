"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, History, Printer, CheckCircle2, AlertCircle, Loader2, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import Link from "next/link";
import { ReceiveStockModal } from "@/components/ReceiveStockModal";
import { IssueStockModal } from "@/components/IssueStockModal";
import { use, useEffect, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  status: string;
}

interface Movement {
  id: number;
  movement_type: "receipt" | "issue" | "adjustment";
  movement_date: string;
  item_name: string;
  item_code: string;
  quantity: number;
  unit: string;
  from_party: string | null;
  to_party: string | null;
  reference: string;
  officer: string | null;
  balance_after: number | null;
}

export default function ConsumableDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [item, setItem] = useState<Consumable | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItemDetails = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch item
      const itemRes = await fetch(`/api/consumables/${id}`);
      let currentItem: Consumable | null = null;
      if (itemRes.ok) {
        currentItem = await itemRes.json();
      } else {
        // Fallback search by id/code if direct lookup returns 404
        const searchRes = await fetch(`/api/consumables?search=${encodeURIComponent(id)}`);
        if (searchRes.ok) {
          const d = await searchRes.json();
          if (d.data?.length > 0) currentItem = d.data[0];
        }
      }

      if (currentItem) {
        setItem(currentItem);

        // 2. Fetch movements for this item
        const movRes = await fetch(`/api/movements?search=${encodeURIComponent(currentItem.name)}&limit=50`);
        if (movRes.ok) {
          const d = await movRes.json();
          setMovements(d.data || []);
        }
      }
    } catch (err) {
      console.error("Failed to load consumable details:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadItemDetails();
  }, [loadItemDetails]);

  if (loading && !item) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-dvla-green" />
          <span>Loading item details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!item) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center space-y-4">
          <p className="text-slate-600">Consumable item not found.</p>
          <Link href="/consumables">
            <Button variant="outline">Return to Inventory</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/consumables">
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{item.name}</h2>
                <Badge variant="outline" className="font-mono text-xs bg-slate-50">
                  {item.item_code}
                </Badge>
              </div>
              <p className="text-sm text-slate-500">{item.category} — {item.station || "Head Office"}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <IssueStockModal defaultItemCode={item.id} onSuccess={loadItemDetails}>
              <Button variant="outline" className="text-dvla-gold border-dvla-gold hover:bg-dvla-gold hover:text-slate-900 font-semibold gap-1.5">
                <ArrowUpRight className="h-4 w-4" />
                Issue Stock
              </Button>
            </IssueStockModal>
            <ReceiveStockModal defaultItemCode={item.id} onSuccess={loadItemDetails}>
              <Button className="bg-dvla-green hover:bg-dvla-green-light text-white font-semibold gap-1.5 shadow-sm">
                <ArrowDownLeft className="h-4 w-4" />
                Receive Stock
              </Button>
            </ReceiveStockModal>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="col-span-1 shadow-sm h-fit border-slate-200">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                <Package className="h-5 w-5 text-dvla-green" />
                Consumable Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Category</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{item.category}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Unit of Measure</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{item.unit}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Station</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{item.station || "Head Office"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Department</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{item.department || "General Store"}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-lg p-2.5 border">
                    <p className="text-xs text-slate-500 font-medium">Received</p>
                    <p className="text-base font-bold text-slate-900 mt-1">{item.received}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 border">
                    <p className="text-xs text-slate-500 font-medium">Issued</p>
                    <p className="text-base font-bold text-slate-900 mt-1">{item.issued}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-200">
                    <p className="text-xs text-emerald-700 font-medium">Balance</p>
                    <p className="text-base font-extrabold text-emerald-800 mt-1">{item.balance}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Reorder Alert Level</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{item.reorder_level} {item.unit}s</p>
                </div>
                <Badge variant="outline" className={
                  item.status === "IN STOCK"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold"
                    : item.status === "LOW STOCK"
                    ? "bg-amber-50 text-amber-700 border-amber-200 font-semibold"
                    : "bg-red-50 text-red-700 border-red-200 font-semibold"
                }>
                  {item.status}
                </Badge>
              </div>

              {item.description && (
                <div className="border-t border-slate-100 pt-4 mt-2">
                  <p className="text-xs text-slate-500 font-medium">Description</p>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">{item.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="col-span-2 space-y-6">
            {/* Movements / Transactions Card */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                  <History className="h-5 w-5 text-dvla-green" />
                  Live Movement History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {movements.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="font-bold text-slate-700">Date</TableHead>
                        <TableHead className="font-bold text-slate-700">Type</TableHead>
                        <TableHead className="font-bold text-slate-700">Reference</TableHead>
                        <TableHead className="font-bold text-slate-700">Party / Station</TableHead>
                        <TableHead className="font-bold text-slate-700 text-right">Quantity</TableHead>
                        <TableHead className="font-bold text-slate-700 text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((m, idx) => (
                        <TableRow key={`${m.id}-${idx}`} className="hover:bg-slate-50/70 border-b border-slate-100">
                          <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                            {m.movement_date ? m.movement_date.slice(0, 10) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              m.movement_type === "receipt"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }>
                              {m.movement_type.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-800 font-semibold">
                            {m.reference}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {m.movement_type === "receipt" ? m.from_party || "Supplier" : m.to_party || "Station"}
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm">
                            {m.movement_type === "receipt" ? (
                              <span className="text-emerald-700">+{m.quantity}</span>
                            ) : (
                              <span className="text-amber-700">-{m.quantity}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono font-semibold text-slate-700">
                            {m.balance_after !== null ? m.balance_after : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No movement records found for this consumable.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
