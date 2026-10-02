"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackagePlus, Sparkles, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

interface ReceiveStockModalProps {
  children: React.ReactNode;
  defaultItemCode?: string | number;
  onSuccess?: () => void;
}

export function ReceiveStockModal({ children, defaultItemCode, onSuccess }: ReceiveStockModalProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form state
  const [selectedConsumableId, setSelectedConsumableId] = useState<string>("");
  const [dateReceived, setDateReceived] = useState<string>(new Date().toISOString().split("T")[0]);
  const [supplier, setSupplier] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [stationId, setStationId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [deliveryCondition, setDeliveryCondition] = useState<string>("Good");
  const [reference, setReference] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const generateGRN = () => {
    const yr = new Date().getFullYear();
    const rnd = Math.floor(1000 + Math.random() * 9000);
    setReference(`GRN-${yr}-${rnd}`);
  };

  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(null);
      generateGRN();

      async function loadLookups() {
        setLoadingData(true);
        try {
          const [consRes, statsRes, deptsRes] = await Promise.all([
            fetch("/api/consumables?limit=200"),
            fetch("/api/stations"),
            fetch("/api/departments"),
          ]);

          let items: Consumable[] = [];
          if (consRes.ok) {
            const d = await consRes.json();
            items = d.data || [];
            setConsumables(items);
          }
          if (statsRes.ok) {
            const d = await statsRes.json();
            setStations(d.data || []);
            if (d.data?.length > 0 && !stationId) {
              setStationId(String(d.data[0].id));
            }
          }
          if (deptsRes.ok) {
            const d = await deptsRes.json();
            setDepartments(d.data || []);
          }

          // Preselect item if defaultItemCode is supplied
          if (defaultItemCode && items.length > 0) {
            const found = items.find(
              (i) => String(i.id) === String(defaultItemCode) || i.item_code === String(defaultItemCode)
            );
            if (found) {
              setSelectedConsumableId(String(found.id));
            } else if (items.length > 0) {
              setSelectedConsumableId(String(items[0].id));
            }
          } else if (items.length > 0 && !selectedConsumableId) {
            setSelectedConsumableId(String(items[0].id));
          }
        } catch (err) {
          console.error("Failed to load modal data:", err);
          setError("Failed to load options from database.");
        } finally {
          setLoadingData(false);
        }
      }

      loadLookups();
    }
  }, [open, defaultItemCode]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const qty = parseInt(quantity) || 0;
    if (!selectedConsumableId) {
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
    if (!reference.trim()) {
      setError("GRN Reference number is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grn_number: reference.trim(),
          consumable_id: Number(selectedConsumableId),
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

      setSuccess(`Stock received successfully! GRN: ${reference}. New balance: ${data.new_balance}.`);
      setTimeout(() => {
        setOpen(false);
        router.refresh();
        if (onSuccess) onSuccess();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving stock receipt.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedItemObj = consumables.find((c) => String(c.id) === selectedConsumableId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden p-6 sm:p-8"
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <PackagePlus className="h-6 w-6 text-dvla-green" />
            Receive Stock Delivery
          </DialogTitle>
          <DialogDescription>
            Record newly delivered consumable stock into the central database. Stock balances will update immediately.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-lg text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Consumable Item */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="receive-item" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Consumable Item <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedConsumableId}
                onValueChange={setSelectedConsumableId}
                disabled={loadingData || submitting}
              >
                <SelectTrigger id="receive-item" className="bg-white">
                  <SelectValue placeholder={loadingData ? "Loading consumables..." : "Select item"} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {consumables.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} ({c.item_code}) — Current: {c.balance} {c.unit}s
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected item stock preview */}
            {selectedItemObj && (
              <div className="md:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Category: </span>
                  <span className="font-semibold text-slate-800">{selectedItemObj.category}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Current Balance: </span>
                  <span className="font-bold text-slate-900 text-sm">{selectedItemObj.balance} {selectedItemObj.unit}s</span>
                </div>
              </div>
            )}

            {/* Date Received */}
            <div className="space-y-1.5">
              <Label htmlFor="receive-date" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Date Received <span className="text-red-500">*</span>
              </Label>
              <Input
                id="receive-date"
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label htmlFor="receive-quantity" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Quantity Received <span className="text-red-500">*</span>
              </Label>
              <Input
                id="receive-quantity"
                type="number"
                min="1"
                placeholder="e.g. 500"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            {/* Supplier */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="receive-supplier" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Supplier / Vendor <span className="text-red-500">*</span>
              </Label>
              <Input
                id="receive-supplier"
                placeholder="e.g. Graphic Communications Group Ltd"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            {/* Reference Number */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="receive-reference" className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  GRN / PO Number <span className="text-red-500">*</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 font-medium px-1.5 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-blue-500" /> Auto
                  </span>
                </Label>
              </div>
              <div className="flex gap-2">
                <Input
                  id="receive-reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. GRN-2026-001"
                  className="font-mono text-sm bg-slate-50 focus:bg-white"
                  disabled={submitting}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 text-slate-600 hover:text-slate-900"
                  title="Regenerate Reference Number"
                  onClick={generateGRN}
                  disabled={submitting}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Station */}
            <div className="space-y-1.5">
              <Label htmlFor="receive-station" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Receiving Station
              </Label>
              <Select value={stationId} onValueChange={setStationId} disabled={loadingData || submitting}>
                <SelectTrigger id="receive-station" className="bg-white">
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

            {/* Department */}
            <div className="space-y-1.5">
              <Label htmlFor="receive-dept" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Department (Optional)
              </Label>
              <Select value={departmentId} onValueChange={setDepartmentId} disabled={loadingData || submitting}>
                <SelectTrigger id="receive-dept" className="bg-white">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Remarks */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="receive-remarks" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Remarks / Delivery Notes
              </Label>
              <Input
                id="receive-remarks"
                placeholder="Additional notes, batch numbers, seal info..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Close
            </Button>
            <Button
              type="submit"
              disabled={submitting || !selectedConsumableId || parseInt(quantity) <= 0 || !supplier.trim()}
              className="bg-dvla-green hover:bg-dvla-green-light text-white font-semibold px-6 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Record"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
