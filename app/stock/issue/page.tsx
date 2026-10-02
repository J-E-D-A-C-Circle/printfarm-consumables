"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PackageMinus, ArrowLeft, AlertCircle, Sparkles, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";

interface Consumable {
  id: number;
  item_code: string;
  name: string;
  category: string;
  category_id: number;
  balance: number;
  unit: string;
  station_id: number | null;
  department_id: number | null;
}

interface Category {
  id: number;
  name: string;
  code_prefix: string;
  purpose: string;
}

interface Station {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
}

function IssueStockContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategoryParam = searchParams.get("category");
  const initialItemParam = searchParams.get("item");

  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [selectedItemId, setSelectedItemId] = useState<string>(initialItemParam || "");
  const [issueQty, setIssueQty] = useState<string>("");
  const [expectedQty, setExpectedQty] = useState<string>("");
  const [stationId, setStationId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("standard");
  const [receivingOfficer, setReceivingOfficer] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [requisitionNumber, setRequisitionNumber] = useState<string>("");
  const [dateIssued, setDateIssued] = useState<string>(new Date().toISOString().split("T")[0]);
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
    async function loadData() {
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
          if (d.data?.length > 0) {
            setStationId(String(d.data[0].id));
          }
        }
        if (deptsRes.ok) {
          const d = await deptsRes.json();
          setDepartments(d.data || []);
          if (d.data?.length > 0) {
            setDepartmentId(String(d.data[0].id));
          }
        }

        // Handle URL params
        if (initialItemParam) {
          const matched = items.find((i) => String(i.id) === initialItemParam);
          if (matched) {
            setSelectedItemId(String(matched.id));
            setSelectedCategoryId(String(matched.category_id));
            setReference(generateRef(matched.category));
          }
        } else if (initialCategoryParam) {
          const matchedCat = cats.find((c) => c.name.toLowerCase() === initialCategoryParam.toLowerCase());
          if (matchedCat) {
            setSelectedCategoryId(String(matchedCat.id));
            setReference(generateRef(matchedCat.name));
            const catItems = items.filter((i) => i.category_id === matchedCat.id);
            if (catItems.length > 0) {
              setSelectedItemId(String(catItems[0].id));
            }
          }
        } else {
          setReference(generateRef());
        }
      } catch (err) {
        console.error("Failed to load issue stock data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [initialCategoryParam, initialItemParam]);

  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    const catObj = categories.find((c) => String(c.id) === catId);
    setReference(generateRef(catObj?.name));

    if (catObj && catObj.purpose === "printing") {
      setPurpose("printing");
    }

    const availableItems = consumables.filter(
      (c) => catId === "all" || String(c.category_id) === catId
    );
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
        setReference(generateRef(it.category));
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

  const handleSubmit = async (e: React.FormEvent) => {
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
      setError(`Cannot issue ${qty} items — only ${currentBalance} available in stock.`);
      return;
    }
    if (!receivingOfficer.trim()) {
      setError("Please enter the name of the receiving officer/technician.");
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
          receiving_officer: receivingOfficer.trim(),
          issued_to: receivingOfficer.trim(),
          reference_number: reference.trim(),
          requisition_number: requisitionNumber.trim() || undefined,
          remarks: remarks.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process stock issue.");
      }

      setSuccess(`Stock successfully issued! Reference: ${reference}. Balance updated to ${remainingBalance}.`);
      setTimeout(() => {
        router.push("/consumables");
        router.refresh();
      }, 1400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error issuing stock.");
    } finally {
      setSubmitting(false);
    }
  };

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
            <h2 className="text-xl font-bold text-slate-900">Issue Stock to Station / Production</h2>
            <p className="text-sm text-slate-500">Record consumables issued for printing or internal departmental operations.</p>
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
                <PackageMinus className="h-5 w-5 text-amber-600" />
                Issuance Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Category Selector */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Category Filter
                  </Label>
                  <Select value={selectedCategoryId} onValueChange={handleCategoryChange} disabled={loading}>
                    <SelectTrigger id="category" className="bg-white">
                      <SelectValue placeholder={loading ? "Loading categories..." : "Select category"} />
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
                <div className="space-y-2">
                  <Label htmlFor="item" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Consumable Item <span className="text-red-500">*</span>
                  </Label>
                  <Select value={selectedItemId} onValueChange={handleItemChange} disabled={loading}>
                    <SelectTrigger id="item" className="bg-white">
                      <SelectValue placeholder={loading ? "Loading items..." : "Select consumable item"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredConsumables.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)} disabled={c.balance === 0}>
                          {c.name} ({c.item_code}) — {c.balance} {c.unit}s available
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Balance Feedback Box */}
                {selectedItemObj && (
                  <div className="md:col-span-2 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Stock Balance</p>
                      <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
                        {currentBalance.toLocaleString()} <span className="text-sm font-normal text-slate-500">{selectedItemObj.unit}s</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Remaining After Issue</p>
                      <p className={`text-2xl font-extrabold mt-0.5 ${isInvalid ? "text-red-600" : "text-emerald-700"}`}>
                        {remainingBalance.toLocaleString()} <span className="text-sm font-normal opacity-70">{selectedItemObj.unit}s</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. Quantity to Issue */}
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Quantity to Issue <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={currentBalance > 0 ? currentBalance : undefined}
                    placeholder="e.g. 50"
                    value={issueQty}
                    onChange={(e) => {
                      setIssueQty(e.target.value);
                      if (!expectedQty || expectedQty === issueQty) {
                        setExpectedQty(e.target.value);
                      }
                    }}
                    className={isInvalid ? "border-red-500 focus-visible:ring-red-500" : ""}
                    required
                  />
                </div>

                {/* 4. Expected Card Output */}
                <div className="space-y-2">
                  <Label htmlFor="expected-qty" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Expected Card Output (Cards) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="expected-qty"
                    type="number"
                    min="0"
                    placeholder="Expected cards to print"
                    value={expectedQty}
                    onChange={(e) => setExpectedQty(e.target.value)}
                    required
                  />
                  <p className="text-[11px] text-slate-500">
                    Amount of consumable to be used to print out expected cards.
                  </p>
                </div>

                {/* 5. Date Issued */}
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Date Issued <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={dateIssued}
                    onChange={(e) => setDateIssued(e.target.value)}
                    required
                  />
                </div>

                {/* 6. Reference Number */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="reference" className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      Reference Number
                      <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-blue-500" /> Auto
                      </span>
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="reference"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g. REQ-2026-042"
                      className="font-mono text-sm bg-slate-50 focus:bg-white"
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
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 7. Receiving Station */}
                <div className="space-y-2">
                  <Label htmlFor="station" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Receiving Station <span className="text-red-500">*</span>
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

                {/* 8. Department */}
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Department <span className="text-red-500">*</span>
                  </Label>
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger id="department" className="bg-white">
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
                <div className="space-y-2">
                  <Label htmlFor="officer" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Receiving Officer / Technician <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="officer"
                    value={receivingOfficer}
                    onChange={(e) => setReceivingOfficer(e.target.value)}
                    placeholder="Full name of staff collecting items"
                    required
                  />
                </div>

                {/* 10. Issuance Purpose */}
                <div className="space-y-2">
                  <Label htmlFor="purpose" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Issuance Purpose <span className="text-red-500">*</span>
                  </Label>
                  <Select value={purpose} onValueChange={setPurpose}>
                    <SelectTrigger id="purpose" className="bg-white">
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="printing">Card Printing Production (Auto-tracks Yield & Returned Work)</SelectItem>
                      <SelectItem value="standard">Standard Internal Department Issue</SelectItem>
                      <SelectItem value="maintenance">Printer Maintenance & Servicing</SelectItem>
                      <SelectItem value="training">Staff Training & Testing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 11. Requisition Number & Remarks */}
                <div className="space-y-2">
                  <Label htmlFor="requisition" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Internal Requisition / Memo No. (Optional)
                  </Label>
                  <Input
                    id="requisition"
                    value={requisitionNumber}
                    onChange={(e) => setRequisitionNumber(e.target.value)}
                    placeholder="e.g. MEMO/DVLA/2026/089"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="remarks" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Remarks / Specific Task Instructions
                  </Label>
                  <Input
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. For driver licenses batch #842"
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
                disabled={submitting || isInvalid || !selectedItemId || qty <= 0}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6 shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing Issue...
                  </>
                ) : (
                  "Confirm & Issue Stock"
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default function IssueStock() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <IssueStockContent />
    </Suspense>
  );
}
