"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackageMinus, AlertCircle, Sparkles, RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Consumable {
  id: number;
  item_code: string;
  name: string;
  unit: string;
  balance: number;
  category: string;
  category_id: number;
  station_id: number | null;
  department_id: number | null;
}

interface Category {
  id: number;
  name: string;
}

interface Station {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
}

interface IssueStockModalProps {
  children: React.ReactNode;
  defaultCategory?: string;
  defaultItemCode?: string | number;
  onSuccess?: () => void;
}

export function IssueStockModal({ children, defaultCategory, defaultItemCode, onSuccess }: IssueStockModalProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form states
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [issueQty, setIssueQty] = useState<string>("");
  const [expectedQty, setExpectedQty] = useState<string>("");
  const [dateIssued, setDateIssued] = useState<string>(new Date().toISOString().split("T")[0]);
  const [stationId, setStationId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("standard");
  const [officer, setOfficer] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const generateRef = (catName?: string) => {
    const prefix = catName ? catName.slice(0, 3).toUpperCase() : "ISS";
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `REQ-${year}-${prefix}-${random}`;
  };

  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(null);

      async function loadLookups() {
        setLoadingData(true);
        try {
          const [consRes, catsRes, statsRes, deptsRes] = await Promise.all([
            fetch("/api/consumables?limit=200"),
            fetch("/api/categories"),
            fetch("/api/stations"),
            fetch("/api/departments"),
          ]);

          let items: Consumable[] = [];
          let cats: Category[] = [];

          if (consRes.ok) {
            const d = await consRes.json();
            items = d.data || [];
            setConsumables(items);
          }
          if (catsRes.ok) {
            const d = await catsRes.json();
            cats = d.data || [];
            setCategories(cats);
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
            if (d.data?.length > 0 && !departmentId) {
              setDepartmentId(String(d.data[0].id));
            }
          }

          // Handle initial defaultItemCode or defaultCategory props
          let targetCatId = "all";
          let targetItemId = "";

          if (defaultItemCode && items.length > 0) {
            const matched = items.find(
              (i) => String(i.id) === String(defaultItemCode) || i.item_code === String(defaultItemCode)
            );
            if (matched) {
              targetItemId = String(matched.id);
              targetCatId = String(matched.category_id);
            }
          } else if (defaultCategory && cats.length > 0) {
            const matchedCat = cats.find(
              (c) => c.name.toLowerCase() === defaultCategory.toLowerCase()
            );
            if (matchedCat) {
              targetCatId = String(matchedCat.id);
              const catItems = items.filter((i) => i.category_id === matchedCat.id);
              if (catItems.length > 0) targetItemId = String(catItems[0].id);
            }
          }

          if (!targetItemId && items.length > 0) {
            targetItemId = String(items[0].id);
            targetCatId = String(items[0].category_id);
          }

          setSelectedCategoryId(targetCatId);
          setSelectedItemId(targetItemId);

          const matchedCatObj = cats.find((c) => String(c.id) === targetCatId);
          setReference(generateRef(matchedCatObj?.name));
        } catch (err) {
          console.error("Failed to load modal lookups:", err);
          setError("Failed to load stock data from server.");
        } finally {
          setLoadingData(false);
        }
      }

      loadLookups();
    }
  }, [open, defaultCategory, defaultItemCode]);

  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    const catObj = categories.find((c) => String(c.id) === catId);
    setReference(generateRef(catObj?.name));

    const availableItems = catId === "all"
      ? consumables
      : consumables.filter((c) => String(c.category_id) === catId);

    if (availableItems.length > 0) {
      setSelectedItemId(String(availableItems[0].id));
    } else {
      setSelectedItemId("");
    }
  };

  const handleItemChange = (itemId: string) => {
    setSelectedItemId(itemId);
    const it = consumables.find((c) => String(c.id) === itemId);
    if (it) {
      if (selectedCategoryId === "all" || String(it.category_id) !== selectedCategoryId) {
        setSelectedCategoryId(String(it.category_id));
        const catObj = categories.find((c) => c.id === it.category_id);
        setReference(generateRef(catObj?.name || it.category));
      }
      if (it.station_id) setStationId(String(it.station_id));
      if (it.department_id) setDepartmentId(String(it.department_id));
    }
  };

  const filteredConsumables = selectedCategoryId === "all"
    ? consumables
    : consumables.filter((c) => String(c.category_id) === selectedCategoryId);

  const selectedItemObj = consumables.find((c) => String(c.id) === selectedItemId);
  const qty = parseInt(issueQty) || 0;
  const currentBalance = selectedItemObj ? selectedItemObj.balance : 0;
  const remainingBalance = currentBalance - qty;
  const isInvalid = remainingBalance < 0;

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedItemId) {
      setError("Please select a consumable item to issue.");
      return;
    }
    if (qty <= 0) {
      setError("Quantity to issue must be at least 1.");
      return;
    }
    if (qty > currentBalance) {
      setError(`Cannot issue ${qty} — only ${currentBalance} available in stock.`);
      return;
    }
    if (!officer.trim()) {
      setError("Please enter the name of the receiving officer.");
      return;
    }
    if (!reference.trim()) {
      setError("Reference number is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consumable_id: Number(selectedItemId),
          quantity: qty,
          expected_quantity: expectedQty ? parseInt(expectedQty) : qty,
          date_issued: dateIssued,
          to_station_id: stationId ? Number(stationId) : null,
          department_id: departmentId ? Number(departmentId) : null,
          purpose,
          receiving_officer: officer.trim(),
          issued_to: officer.trim(),
          reference_number: reference.trim(),
          remarks: remarks.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process stock issue.");
      }

      setSuccess(`Stock issued successfully! Ref: ${reference}. Remaining balance: ${remainingBalance}.`);
      setTimeout(() => {
        setOpen(false);
        router.refresh();
        if (onSuccess) onSuccess();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error issuing stock.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden p-6 sm:p-8"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <PackageMinus className="h-6 w-6 text-dvla-gold" />
            Issue Consumable Stock
          </DialogTitle>
          <DialogDescription>
            Record consumables issued to stations or departments. System automatically updates stock balance and tracks movements.
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

        <form onSubmit={handleIssue} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Category Filter */}
            <div className="space-y-1.5">
              <Label htmlFor="issue-category" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Consumable Category
              </Label>
              <Select
                value={selectedCategoryId}
                onValueChange={handleCategoryChange}
                disabled={loadingData || submitting}
              >
                <SelectTrigger id="issue-category" className="bg-white">
                  <SelectValue placeholder={loadingData ? "Loading..." : "Select category"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Consumable Item Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="issue-item" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Consumable Item <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedItemId}
                onValueChange={handleItemChange}
                disabled={loadingData || submitting}
              >
                <SelectTrigger id="issue-item" className="bg-white">
                  <SelectValue placeholder={loadingData ? "Loading items..." : "Select item to issue"} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {filteredConsumables.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} disabled={c.balance === 0}>
                      {c.name} ({c.item_code}) — {c.balance} {c.unit}s available
                    </SelectItem>
                  ))}
                  {filteredConsumables.length === 0 && (
                    <div className="p-2 text-xs text-slate-500">No items in this category.</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Stock Balance Banner */}
            {selectedItemObj && (
              <div className="md:col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Current Stock Balance</p>
                  <p className="text-xl font-bold text-slate-900">
                    {currentBalance} <span className="text-xs font-normal text-slate-500">{selectedItemObj.unit}s</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium">Remaining After Issue</p>
                  <p className={`text-xl font-bold ${isInvalid ? "text-red-600" : "text-emerald-700"}`}>
                    {remainingBalance} <span className="text-xs font-normal opacity-70">{selectedItemObj.unit}s</span>
                  </p>
                </div>
              </div>
            )}

            {/* 3. Quantity to Issue */}
            <div className="space-y-1.5">
              <Label htmlFor="issue-qty" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Quantity to Issue <span className="text-red-500">*</span>
              </Label>
              <Input
                id="issue-qty"
                type="number"
                min="1"
                max={currentBalance > 0 ? currentBalance : undefined}
                placeholder="0"
                value={issueQty}
                onChange={(e) => {
                  setIssueQty(e.target.value);
                  if (!expectedQty || expectedQty === issueQty) {
                    setExpectedQty(e.target.value);
                  }
                }}
                className={isInvalid ? "border-red-500 focus-visible:ring-red-500" : ""}
                disabled={submitting}
                required
              />
              {isInvalid && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" /> Cannot issue more than available balance ({currentBalance}).
                </p>
              )}
            </div>

            {/* 4. Expected Quantity for Card Output */}
            <div className="space-y-1.5">
              <Label htmlFor="issue-expected-qty" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Expected Card Output (Cards) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="issue-expected-qty"
                type="number"
                min="0"
                placeholder="Expected number of cards to print"
                value={expectedQty}
                onChange={(e) => setExpectedQty(e.target.value)}
                disabled={submitting}
                required
              />
              <p className="text-[11px] text-slate-500">
                Amount of consumable to be used to print out expected cards.
              </p>
            </div>

            {/* 5. Date Issued */}
            <div className="space-y-1.5">
              <Label htmlFor="issue-date" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Date Issued <span className="text-red-500">*</span>
              </Label>
              <Input
                id="issue-date"
                type="date"
                value={dateIssued}
                onChange={(e) => setDateIssued(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            {/* 6. Reference Number */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="issue-reference" className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  Reference Number <span className="text-red-500">*</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 font-medium px-1.5 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-blue-500" /> Auto
                  </span>
                </Label>
              </div>
              <div className="flex gap-2">
                <Input
                  id="issue-reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. REQ-2026-042"
                  className="font-mono text-sm bg-slate-50 focus:bg-white"
                  disabled={submitting}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 text-slate-600 hover:text-slate-900"
                  title="Regenerate Reference"
                  onClick={() => {
                    const curCat = categories.find((c) => String(c.id) === selectedCategoryId);
                    setReference(generateRef(curCat?.name));
                  }}
                  disabled={submitting}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 7. Receiving Station */}
            <div className="space-y-1.5">
              <Label htmlFor="issue-station" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Receiving Station <span className="text-red-500">*</span>
              </Label>
              <Select value={stationId} onValueChange={setStationId} disabled={loadingData || submitting}>
                <SelectTrigger id="issue-station" className="bg-white">
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

            {/* 8. Department */}
            <div className="space-y-1.5">
              <Label htmlFor="issue-department" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Department <span className="text-red-500">*</span>
              </Label>
              <Select value={departmentId} onValueChange={setDepartmentId} disabled={loadingData || submitting}>
                <SelectTrigger id="issue-department" className="bg-white">
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

            {/* 9. Receiving Officer */}
            <div className="space-y-1.5">
              <Label htmlFor="issue-officer" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Receiving Officer / Staff <span className="text-red-500">*</span>
              </Label>
              <Input
                id="issue-officer"
                value={officer}
                onChange={(e) => setOfficer(e.target.value)}
                placeholder="Full name of staff collecting items"
                disabled={submitting}
                required
              />
            </div>

            {/* 10. Issuance Purpose */}
            <div className="space-y-1.5">
              <Label htmlFor="issue-purpose" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Issuance Purpose <span className="text-red-500">*</span>
              </Label>
              <Select value={purpose} onValueChange={setPurpose} disabled={submitting}>
                <SelectTrigger id="issue-purpose" className="bg-white">
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="printing">Card Printing Production (Auto-tracks Yield & Spoilage)</SelectItem>
                  <SelectItem value="standard">Standard Internal Department Issue</SelectItem>
                  <SelectItem value="maintenance">Printer Servicing & Maintenance</SelectItem>
                  <SelectItem value="training">Staff Training & Testing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 11. Remarks */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="issue-remarks" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Remarks / Special Instructions
              </Label>
              <Input
                id="issue-remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Specific batch instructions, driver license series..."
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || isInvalid || !selectedItemId || qty <= 0 || !officer.trim()}
              className="bg-dvla-gold hover:bg-dvla-gold-hover text-slate-900 font-semibold px-6 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                "Issue Stock"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
