"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  TrendingUp,
  Send,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { gooeyToast } from "@/components/ui/gooey-toast";

interface Category {
  id: number;
  name: string;
  code_prefix?: string;
}

interface IssueStockModalProps {
  children: React.ReactNode;
  defaultCategory?: string;
  defaultItemCode?: string | number;
  defaultMode?: "request" | "issue" | "complete";
  onSuccess?: () => void;
}

export function IssueStockModal({
  children,
  defaultCategory,
  defaultMode = "issue",
  onSuccess,
}: IssueStockModalProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [entryMode, setEntryMode] = useState<"request" | "issue" | "complete">(defaultMode);

  // Stage 1: Request fields
  const [reference, setReference] = useState<string>("");
  const [dateRequested, setDateRequested] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  const [quantityRequested, setQuantityRequested] = useState<string>("");
  const [requestedBy, setRequestedBy] = useState<string>("");

  // Stage 2: Issue fields
  const [quantityIssued, setQuantityIssued] = useState<string>("");
  const [issuedQtyTouched, setIssuedQtyTouched] = useState<boolean>(false);
  const [issuedBy, setIssuedBy] = useState<string>("MR. RICHARD ANAFO");
  const [receivedBy, setReceivedBy] = useState<string>("");

  // Stage 3: Production Result fields
  const [dateReturned, setDateReturned] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [totalConsumption, setTotalConsumption] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const generateRef = (catName?: string) => {
    const prefix = catName
      ? catName.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase()
      : "REQ";
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `REQ-${year}-${prefix}-${random}`;
  };

  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(null);
      setEntryMode(defaultMode);
      const today = new Date().toISOString().split("T")[0];
      setDateRequested(today);
      setDateReturned(today);
      setQuantityRequested("");
      setQuantityIssued("");
      setIssuedQtyTouched(false);
      setTotalConsumption("");
      setRemarks("");

      async function loadCategories() {
        setLoadingData(true);
        try {
          const res = await fetch("/api/categories");
          if (res.ok) {
            const d = await res.json();
            const cats: Category[] = d.data || [];
            setCategories(cats);

            let initialCat = cats[0]?.name || "Holo Patch";
            if (defaultCategory && defaultCategory !== "all") {
              const matched = cats.find(
                (c) => c.name.toLowerCase() === defaultCategory.toLowerCase()
              );
              if (matched) initialCat = matched.name;
            }
            setSelectedCategoryName(initialCat);
            setReference(generateRef(initialCat));
          }
        } catch (err) {
          console.error("Failed to load consumable types:", err);
        } finally {
          setLoadingData(false);
        }
      }
      loadCategories();
    }
  }, [open, defaultCategory, defaultMode]);

  const handleCategoryChange = (catName: string) => {
    setSelectedCategoryName(catName);
    setReference(generateRef(catName));
  };

  const handleReqQtyChange = (val: string) => {
    setQuantityRequested(val);
    if (!issuedQtyTouched) {
      setQuantityIssued(val);
    }
  };

  const reqNum = parseInt(quantityRequested) || 0;
  const issNum = parseInt(quantityIssued) || 0;
  const diff = issNum - reqNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedCategoryName) {
      setError("Please select a consumable type.");
      return;
    }
    if (reqNum <= 0) {
      setError("Quantity requested must be greater than zero.");
      return;
    }
    if (!requestedBy.trim()) {
      setError("Please enter who requested the consumable (Requested By).");
      return;
    }

    if (entryMode === "issue" || entryMode === "complete") {
      if (quantityIssued.trim() === "" || issNum < 0) {
        setError("Please enter a valid Quantity Issued.");
        return;
      }
      if (!issuedBy.trim()) {
        setError("Please enter who issued the consumable (Issued By).");
        return;
      }
      if (!receivedBy.trim()) {
        setError("Please enter who received the consumable (Received By).");
        return;
      }
    }

    if (entryMode === "complete") {
      const consNum = parseInt(totalConsumption);
      if (totalConsumption.trim() === "" || Number.isNaN(consNum) || consNum < 0) {
        setError("Please enter the Total Consumption (work done outcome).");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        reference_number: reference.trim(),
        date_requested: dateRequested,
        consumable_name: selectedCategoryName,
        quantity_requested: reqNum,
        requested_by: requestedBy.trim().toUpperCase(),
        remarks: remarks.trim() || undefined,
      };

      if (entryMode === "issue" || entryMode === "complete") {
        payload.quantity_issued = issNum;
        payload.issued_by = issuedBy.trim().toUpperCase();
        payload.received_by = receivedBy.trim().toUpperCase();
      }

      if (entryMode === "complete") {
        payload.date_returned = dateReturned || dateRequested;
        payload.total_consumption = parseInt(totalConsumption) || 0;
      }

      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save record.");
      }

      const toastTitle =
        entryMode === "request"
          ? "Consumable Request Logged"
          : entryMode === "issue"
          ? "Consumable Issued"
          : "Return Record Saved";

      const toastDescription =
        entryMode === "request"
          ? `Request #${reference} for ${reqNum} ${selectedCategoryName} requested by ${requestedBy.trim().toUpperCase()} has been logged.`
          : entryMode === "issue"
          ? `Issued ${issNum} ${selectedCategoryName} (vs ${reqNum} requested) to ${receivedBy.trim().toUpperCase()} under #${reference}.`
          : `Saved full return entry #${reference} for ${selectedCategoryName} with Total Consumption of ${Number(totalConsumption).toLocaleString()}.`;

      setSuccess(toastDescription);
      gooeyToast.success(toastTitle, {
        description: toastDescription,
      });

      setTimeout(() => {
        setOpen(false);
        router.refresh();
        if (onSuccess) onSuccess();
      }, 600);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error saving record.";
      setError(message);
      gooeyToast.error("Failed to Save Entry", {
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden p-6 sm:p-7 border-slate-200"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-dvla-green/10 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="h-4 w-4 text-dvla-green" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-900">
                New Consumables Request & Return Entry
              </DialogTitle>
              <DialogDescription className="text-xs font-normal text-slate-500 mt-0.5">
                Log a request, issue exact, more, or less quantity, and record production consumption.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Clean Segmented Stage Switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setEntryMode("request")}
            className={`px-3 py-2 rounded-md text-xs transition-all text-center ${
              entryMode === "request"
                ? "bg-white text-slate-900 shadow-xs font-medium"
                : "text-slate-600 hover:text-slate-900 font-normal"
            }`}
          >
            1. Make Request
          </button>

          <button
            type="button"
            onClick={() => setEntryMode("issue")}
            className={`px-3 py-2 rounded-md text-xs transition-all text-center ${
              entryMode === "issue"
                ? "bg-white text-slate-900 shadow-xs font-medium"
                : "text-slate-600 hover:text-slate-900 font-normal"
            }`}
          >
            2. Request & Issue
          </button>

          <button
            type="button"
            onClick={() => setEntryMode("complete")}
            className={`px-3 py-2 rounded-md text-xs transition-all text-center ${
              entryMode === "complete"
                ? "bg-white text-slate-900 shadow-xs font-medium"
                : "text-slate-600 hover:text-slate-900 font-normal"
            }`}
          >
            3. Full Return Entry
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-lg text-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* SECTION 1: CONSUMABLES REQUEST */}
          <div className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
              <span className="text-xs font-medium text-slate-700">
                1. Consumables Request
              </span>
              <span className="text-[11px] text-slate-400">{reference}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-slate-500">
                  Date Requested
                </Label>
                <Input
                  type="date"
                  value={dateRequested}
                  onChange={(e) => setDateRequested(e.target.value)}
                  className="bg-white border-slate-200 h-9 text-xs font-normal"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-slate-500">
                  Consumable Type
                </Label>
                <Select
                  value={selectedCategoryName}
                  onValueChange={handleCategoryChange}
                  disabled={loadingData}
                >
                  <SelectTrigger className="bg-white border-slate-200 h-9 text-xs font-normal">
                    <SelectValue placeholder="Select consumable type" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-slate-500">
                  Quantity Requested
                </Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 10"
                  value={quantityRequested}
                  onChange={(e) => handleReqQtyChange(e.target.value)}
                  className="bg-white border-slate-200 h-9 text-xs font-normal"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-normal text-slate-500">
                  Requested By
                </Label>
                <Input
                  placeholder="e.g. GEORGE ADJEI"
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  className="bg-white border-slate-200 h-9 text-xs uppercase font-normal"
                  required
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ISSUANCE */}
          {(entryMode === "issue" || entryMode === "complete") && (
            <div className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5">
                <div>
                  <span className="text-xs font-medium text-slate-700">
                    2. Consumable Issuance
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Give out the exact quantity requested, more, or less.
                  </p>
                </div>

                {reqNum > 0 && quantityIssued !== "" && (
                  <Badge
                    variant="outline"
                    className={
                      diff === 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-normal"
                        : diff < 0
                        ? "bg-amber-50 text-amber-700 border-amber-200 font-normal"
                        : "bg-blue-50 text-blue-700 border-blue-200 font-normal"
                    }
                  >
                    {diff === 0
                      ? `Exact match (${issNum})`
                      : diff < 0
                      ? `${Math.abs(diff)} less than requested`
                      : `+${diff} more than requested`}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-normal text-slate-500">
                      Quantity Issued
                    </Label>
                    {reqNum > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuantityIssued(String(reqNum));
                          setIssuedQtyTouched(true);
                        }}
                        className="text-[11px] text-blue-600 hover:underline font-normal"
                      >
                        Use exact ({reqNum})
                      </button>
                    )}
                  </div>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Exact, more, or less"
                    value={quantityIssued}
                    onChange={(e) => {
                      setQuantityIssued(e.target.value);
                      setIssuedQtyTouched(true);
                    }}
                    className="bg-white border-slate-200 h-9 text-xs font-medium text-blue-700"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">
                    Issued By
                  </Label>
                  <Input
                    placeholder="e.g. MR. RICHARD ANAFO"
                    value={issuedBy}
                    onChange={(e) => setIssuedBy(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-xs uppercase font-normal"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">
                    Received By
                  </Label>
                  <Input
                    placeholder="e.g. GIDEON ODOOM"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-xs uppercase font-normal"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: PRODUCTION RESULT */}
          {entryMode === "complete" && (
            <div className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
                <div>
                  <span className="text-xs font-medium text-slate-700">
                    3. Production Result (Total Consumption)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Record the date returned and total work done out of the consumable.
                  </p>
                </div>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">
                    Date Returned
                  </Label>
                  <Input
                    type="date"
                    value={dateReturned}
                    onChange={(e) => setDateReturned(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-xs font-normal"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">
                    Total Consumption (Work Done)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 16617"
                    value={totalConsumption}
                    onChange={(e) => setTotalConsumption(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-xs font-medium text-emerald-700"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Optional Remarks */}
          <div className="space-y-1.5">
            <Label className="text-xs font-normal text-slate-500">
              Remarks (Optional)
            </Label>
            <Input
              placeholder="Optional notes..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="bg-white border-slate-200 h-9 text-xs font-normal"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="h-9 text-xs font-normal border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-dvla-green hover:bg-dvla-green-light text-white font-medium h-9 text-xs px-5 gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : entryMode === "request" ? (
                <>
                  <Send className="h-3.5 w-3.5" /> Submit Request
                </>
              ) : entryMode === "issue" ? (
                <>
                  <ArrowRight className="h-3.5 w-3.5" /> Submit Request & Issue
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Save Return Record
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
