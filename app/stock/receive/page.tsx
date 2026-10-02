"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PackagePlus, ArrowLeft, AlertCircle, CheckCircle2, Loader2, Sparkles, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface Consumable {
  id: number;
  item_code: string;
  name: string;
  unit: string;
  balance: number;
  category: string;
}

interface Station {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
}

export default function ReceiveStock() {
  const router = useRouter();

  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [grnNumber, setGrnNumber] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [dateReceived, setDateReceived] = useState(new Date().toISOString().split("T")[0]);
  const [supplier, setSupplier] = useState("");
  const [consumableId, setConsumableId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [stationId, setStationId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [deliveryCondition, setDeliveryCondition] = useState("Good");
  const [remarks, setRemarks] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const generateGRN = () => {
    const yr = new Date().getFullYear();
    const rnd = Math.floor(1000 + Math.random() * 9000);
    setGrnNumber(`GRN-${yr}-${rnd}`);
  };

  useEffect(() => {
    generateGRN();
    async function loadData() {
      try {
        const [consRes, statsRes, deptsRes] = await Promise.all([
          fetch("/api/consumables?limit=200"),
          fetch("/api/stations"),
          fetch("/api/departments"),
        ]);
        if (consRes.ok) {
          const d = await consRes.json();
          setConsumables(d.data || []);
          if (d.data?.length > 0) setConsumableId(String(d.data[0].id));
        }
        if (statsRes.ok) {
          const d = await statsRes.json();
          setStations(d.data || []);
          if (d.data?.length > 0) setStationId(String(d.data[0].id));
        }
        if (deptsRes.ok) {
          const d = await deptsRes.json();
          setDepartments(d.data || []);
          if (d.data?.length > 0) setDepartmentId(String(d.data[0].id));
        }
      } catch (err) {
        console.error("Failed to load receiving data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const qty = parseInt(quantity) || 0;
    if (!consumableId) {
      setError("Please select a consumable item.");
      return;
    }
    if (qty <= 0) {
      setError("Quantity received must be at least 1.");
      return;
    }
    if (!supplier.trim()) {
      setError("Supplier name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grn_number: grnNumber,
          po_number: poNumber.trim() || undefined,
          consumable_id: Number(consumableId),
          quantity: qty,
          supplier: supplier.trim(),
          station_id: stationId ? Number(stationId) : null,
          department_id: departmentId ? Number(departmentId) : null,
          delivery_condition: deliveryCondition,
          date_received: dateReceived,
          remarks: remarks.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record stock receipt.");
      }

      setSuccess(`Stock received successfully! GRN: ${grnNumber}. New balance updated to ${data.balance}.`);
      setTimeout(() => {
        router.push("/consumables");
        router.refresh();
      }, 1400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving stock receipt.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedConsumable = consumables.find((c) => String(c.id) === consumableId);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/consumables">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Receive Stock / Delivery (GRN)</h2>
            <p className="text-sm text-slate-500">Record incoming shipments from suppliers and increase inventory balance.</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-medium">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                <PackagePlus className="h-5 w-5 text-dvla-green" />
                Goods Received Note (GRN) Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* GRN Number */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="grn" className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      GRN Number
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-emerald-600" /> Auto
                      </span>
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="grn"
                      value={grnNumber}
                      onChange={(e) => setGrnNumber(e.target.value)}
                      className="font-mono text-sm bg-slate-50 focus:bg-white"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 text-slate-600 hover:text-slate-900"
                      onClick={generateGRN}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Date Received */}
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Date Received <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={dateReceived}
                    onChange={(e) => setDateReceived(e.target.value)}
                    required
                  />
                </div>

                {/* Consumable Item */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="item" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Consumable Item Delivered <span className="text-red-500">*</span>
                  </Label>
                  <Select value={consumableId} onValueChange={setConsumableId} disabled={loading}>
                    <SelectTrigger id="item" className="bg-white">
                      <SelectValue placeholder={loading ? "Loading items..." : "Select consumable item"} />
                    </SelectTrigger>
                    <SelectContent>
                      {consumables.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name} ({c.item_code}) — Current: {c.balance} {c.unit}s
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Supplier */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="supplier" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Supplier / Vendor <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="supplier"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="e.g. Graphic Communications Group Ltd"
                    required
                  />
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="qty" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Quantity Received <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="qty"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 500"
                    required
                  />
                </div>

                {/* Destination Station */}
                <div className="space-y-2">
                  <Label htmlFor="station" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Destination Station
                  </Label>
                  <Select value={stationId} onValueChange={setStationId}>
                    <SelectTrigger id="station" className="bg-white">
                      <SelectValue placeholder="Select station" />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Delivery Condition */}
                <div className="space-y-2">
                  <Label htmlFor="condition" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Delivery Condition
                  </Label>
                  <Select value={deliveryCondition} onValueChange={setDeliveryCondition}>
                    <SelectTrigger id="condition" className="bg-white">
                      <SelectValue placeholder="Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Good">Good Condition (Accept)</SelectItem>
                      <SelectItem value="Damaged">Damaged Packages Detected</SelectItem>
                      <SelectItem value="Partial">Partial Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* PO Number */}
                <div className="space-y-2">
                  <Label htmlFor="po" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Purchase Order (PO) Number (Optional)
                  </Label>
                  <Input
                    id="po"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="e.g. PO-2026-088"
                  />
                </div>

                {/* Remarks */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="remarks" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Inspection Remarks & Notes
                  </Label>
                  <Input
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Batch expiry dates, seal numbers, verification notes..."
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3 py-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !consumableId || parseInt(quantity) <= 0}
                className="bg-dvla-green hover:bg-dvla-green-light text-white font-semibold px-6 shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Receipt...
                  </>
                ) : (
                  "Confirm Goods Receipt"
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}
