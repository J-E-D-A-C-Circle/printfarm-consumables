"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import {
  FileSignature,
  Save,
  AlertCircle,
  TrendingUp,
  Send,
  Edit3,
  Loader2,
} from "lucide-react";

export interface ReturnSheetRecord {
  id: number;
  reference_number: string;
  date_requested: string;
  date_issued?: string;
  category_id?: number | null;
  consumable_name?: string;
  category?: string;
  item_name?: string;
  quantity_requested?: number;
  expected_quantity?: number;
  quantity_issued?: number | null;
  quantity?: number;
  issued_by?: string | null;
  requested_by?: string;
  received_by?: string | null;
  receiving_officer?: string | null;
  date_returned?: string | null;
  total_consumption?: number | null;
  status?: "Pending Issue" | "Issued" | "Completed" | string;
  remarks?: string | null;
}

interface ReconciliationModalProps {
  children: React.ReactNode;
  item?: {
    id: number;
    name: string;
    item_code?: string;
  };
  issueRecord: ReturnSheetRecord;
  initialMode?: "issue" | "return" | "edit";
  onSuccess?: () => void;
}

export function ReconciliationModal({
  children,
  issueRecord,
  initialMode,
  onSuccess,
}: ReconciliationModalProps) {
  const [open, setOpen] = useState(false);

  const reqQty = Number(
    issueRecord.quantity_requested ?? issueRecord.expected_quantity ?? issueRecord.quantity ?? 0
  );
  const currentIssuedQty =
    issueRecord.quantity_issued !== undefined && issueRecord.quantity_issued !== null
      ? Number(issueRecord.quantity_issued)
      : issueRecord.status === "Pending Issue"
      ? null
      : Number(issueRecord.quantity ?? reqQty);

  const consumableLabel =
    issueRecord.consumable_name || issueRecord.category || issueRecord.item_name || "Consumable";

  const defaultTab =
    initialMode ||
    (issueRecord.status === "Pending Issue"
      ? "issue"
      : issueRecord.status === "Issued"
      ? "return"
      : "edit");

  const [activeTab, setActiveTab] = useState<"issue" | "return" | "edit">(defaultTab);

  // Form states
  const [dateRequested, setDateRequested] = useState(
    (issueRecord.date_requested || issueRecord.date_issued || "").slice(0, 10)
  );
  const [consumableName, setConsumableName] = useState(consumableLabel);
  const [quantityRequested, setQuantityRequested] = useState(String(reqQty));
  const [requestedBy, setRequestedBy] = useState(issueRecord.requested_by || "");

  const [quantityIssued, setQuantityIssued] = useState(
    currentIssuedQty !== null ? String(currentIssuedQty) : String(reqQty)
  );
  const [issuedBy, setIssuedBy] = useState(issueRecord.issued_by || "MR. RICHARD ANAFO");
  const [receivedBy, setReceivedBy] = useState(
    issueRecord.received_by || issueRecord.receiving_officer || ""
  );

  const [dateReturned, setDateReturned] = useState(
    issueRecord.date_returned
      ? issueRecord.date_returned.slice(0, 10)
      : new Date().toISOString().split("T")[0]
  );
  const [totalConsumption, setTotalConsumption] = useState(
    issueRecord.total_consumption !== null && issueRecord.total_consumption !== undefined
      ? String(issueRecord.total_consumption)
      : ""
  );
  const [remarks, setRemarks] = useState(issueRecord.remarks || "");

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      const nextMode =
        initialMode ||
        (issueRecord.status === "Pending Issue"
          ? "issue"
          : issueRecord.status === "Issued"
          ? "return"
          : "edit");
      setActiveTab(nextMode);

      const rQty = Number(
        issueRecord.quantity_requested ?? issueRecord.expected_quantity ?? issueRecord.quantity ?? 0
      );
      const iQty =
        issueRecord.quantity_issued !== undefined && issueRecord.quantity_issued !== null
          ? Number(issueRecord.quantity_issued)
          : issueRecord.status === "Pending Issue"
          ? rQty
          : Number(issueRecord.quantity ?? rQty);

      setDateRequested(
        (issueRecord.date_requested || issueRecord.date_issued || new Date().toISOString()).slice(0, 10)
      );
      setConsumableName(
        issueRecord.consumable_name || issueRecord.category || issueRecord.item_name || "Holo Patch"
      );
      setQuantityRequested(String(rQty));
      setRequestedBy(issueRecord.requested_by || "");
      setQuantityIssued(String(iQty));
      setIssuedBy(issueRecord.issued_by || "MR. RICHARD ANAFO");
      setReceivedBy(issueRecord.received_by || issueRecord.receiving_officer || "");
      setDateReturned(
        issueRecord.date_returned
          ? issueRecord.date_returned.slice(0, 10)
          : new Date().toISOString().split("T")[0]
      );
      setTotalConsumption(
        issueRecord.total_consumption !== null && issueRecord.total_consumption !== undefined
          ? String(issueRecord.total_consumption)
          : ""
      );
      setRemarks(issueRecord.remarks || "");

      fetch("/api/categories")
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((d) => setCategories(d.data || []))
        .catch(() => {});
    }
  }, [open, issueRecord, initialMode]);

  const parsedReq = parseInt(quantityRequested) || 0;
  const parsedIss = parseInt(quantityIssued) || 0;
  const variance = parsedIss - parsedReq;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      let payload: Record<string, unknown> = { id: issueRecord.id };

      if (activeTab === "issue") {
        if (quantityIssued.trim() === "" || parsedIss < 0) {
          throw new Error("Please enter a valid Quantity Issued.");
        }
        if (!issuedBy.trim()) {
          throw new Error("Please enter Issued By.");
        }
        if (!receivedBy.trim()) {
          throw new Error("Please enter Received By.");
        }
        payload = {
          id: issueRecord.id,
          action: "issue",
          quantity_issued: parsedIss,
          issued_by: issuedBy.trim().toUpperCase(),
          received_by: receivedBy.trim().toUpperCase(),
          remarks: remarks.trim() || null,
        };
      } else if (activeTab === "return") {
        const consVal = parseInt(totalConsumption);
        if (totalConsumption.trim() === "" || Number.isNaN(consVal) || consVal < 0) {
          throw new Error("Please enter the Total Consumption (work done out of the consumable).");
        }
        payload = {
          id: issueRecord.id,
          action: "return",
          quantity_issued: parsedIss,
          issued_by: issuedBy.trim().toUpperCase(),
          received_by: receivedBy.trim().toUpperCase(),
          date_returned: dateReturned || new Date().toISOString().split("T")[0],
          total_consumption: consVal,
          remarks: remarks.trim() || null,
        };
      } else {
        payload = {
          id: issueRecord.id,
          action: "edit",
          date_requested: dateRequested,
          consumable_name: consumableName,
          quantity_requested: parsedReq,
          quantity_issued: quantityIssued.trim() === "" ? null : parsedIss,
          issued_by: issuedBy.trim() ? issuedBy.trim().toUpperCase() : null,
          requested_by: requestedBy.trim().toUpperCase(),
          received_by: receivedBy.trim() ? receivedBy.trim().toUpperCase() : null,
          date_returned: dateReturned.trim() || null,
          total_consumption:
            totalConsumption.trim() === "" ? null : parseInt(totalConsumption) || 0,
          remarks: remarks.trim() || null,
        };
      }

      const res = await fetch("/api/issues", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update record.");
      }

      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving changes.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden p-6 sm:p-7 border-slate-200">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-dvla-green/10 flex items-center justify-center shrink-0">
                <FileSignature className="h-4 w-4 text-dvla-green" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-slate-900">
                  {activeTab === "issue"
                    ? "Issue Requested Consumable"
                    : activeTab === "return"
                    ? "Record Production Consumption"
                    : "Edit Return Sheet Row"}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="font-medium text-slate-700">{consumableName}</span> •{" "}
                  <span>{issueRecord.reference_number}</span>
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className={
                issueRecord.status === "Completed"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-normal"
                  : issueRecord.status === "Issued"
                  ? "bg-blue-50 text-blue-700 border-blue-200 font-normal"
                  : "bg-amber-50 text-amber-700 border-amber-200 font-normal"
              }
            >
              {issueRecord.status || "Pending Issue"}
            </Badge>
          </div>
        </DialogHeader>

        {/* Clean Segmented Tabs */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab("issue")}
            className={`py-2 px-3 rounded-md text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "issue"
                ? "bg-white text-slate-900 shadow-xs font-medium"
                : "text-slate-600 hover:text-slate-900 font-normal"
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            1. Issue Qty
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("return")}
            className={`py-2 px-3 rounded-md text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "return"
                ? "bg-white text-slate-900 shadow-xs font-medium"
                : "text-slate-600 hover:text-slate-900 font-normal"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            2. Record Consumption
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`py-2 px-3 rounded-md text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "edit"
                ? "bg-white text-slate-900 shadow-xs font-medium"
                : "text-slate-600 hover:text-slate-900 font-normal"
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" />
            3. Edit Row
          </button>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Date Requested</span>
            <span className="font-medium text-slate-800 mt-0.5 block">{dateRequested || "—"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Requested By</span>
            <span className="font-medium text-slate-800 truncate mt-0.5 block">{requestedBy || "—"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Qty Requested</span>
            <span className="font-medium text-slate-800 mt-0.5 block">{parsedReq}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Qty Issued</span>
            <span className="font-medium text-blue-700 mt-0.5 block">
              {quantityIssued !== "" ? parsedIss : "Pending"}
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-lg text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {activeTab === "issue" && (
            <div className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
                <div>
                  <h4 className="text-xs font-medium text-slate-700">
                    Issue Consumable Against Request
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Give out the exact quantity requested ({parsedReq}), or enter more or less.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    variance === 0
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-normal"
                      : variance < 0
                      ? "bg-amber-50 text-amber-700 border-amber-200 font-normal"
                      : "bg-blue-50 text-blue-700 border-blue-200 font-normal"
                  }
                >
                  {variance === 0
                    ? `Exact match (${parsedIss})`
                    : variance < 0
                    ? `${Math.abs(variance)} less than requested`
                    : `+${variance} more than requested`}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-normal text-slate-500">
                      Quantity Issued
                    </Label>
                    <button
                      type="button"
                      onClick={() => setQuantityIssued(String(parsedReq))}
                      className="text-[11px] text-blue-600 hover:underline font-normal"
                    >
                      Use exact ({parsedReq})
                    </button>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={quantityIssued}
                    onChange={(e) => setQuantityIssued(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-xs font-medium text-blue-700"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">
                    Issued By
                  </Label>
                  <Input
                    value={issuedBy}
                    onChange={(e) => setIssuedBy(e.target.value)}
                    placeholder="e.g. MR. RICHARD ANAFO"
                    className="bg-white border-slate-200 h-9 text-xs uppercase font-normal"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">
                    Received By
                  </Label>
                  <Input
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="e.g. GIDEON ODOOM"
                    className="bg-white border-slate-200 h-9 text-xs uppercase font-normal"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "return" && (
            <div className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-4">
              <div className="border-b border-slate-200/70 pb-2.5">
                <h4 className="text-xs font-medium text-slate-700">
                  Production Result — Total Consumption
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Record the date returned and total work done out of the {parsedIss} issued {consumableName}.
                </p>
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-200/70">
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">Qty Issued</Label>
                  <Input
                    type="number"
                    min="0"
                    value={quantityIssued}
                    onChange={(e) => setQuantityIssued(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-xs font-normal"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">Issued By</Label>
                  <Input
                    value={issuedBy}
                    onChange={(e) => setIssuedBy(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-xs uppercase font-normal"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">Received By</Label>
                  <Input
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-xs uppercase font-normal"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "edit" && (
            <div className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">Date Requested</Label>
                  <Input
                    type="date"
                    value={dateRequested}
                    onChange={(e) => setDateRequested(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-xs font-normal"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">Consumable Type</Label>
                  <Select value={consumableName} onValueChange={setConsumableName}>
                    <SelectTrigger className="bg-white border-slate-200 h-9 text-xs font-normal">
                      <SelectValue />
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
                  <Label className="text-xs font-normal text-slate-500">Quantity Requested</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantityRequested}
                    onChange={(e) => setQuantityRequested(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-xs font-normal"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">
                    Quantity Issued
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Leave blank if Pending Issue"
                    value={quantityIssued}
                    onChange={(e) => setQuantityIssued(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-xs font-medium text-blue-700"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">Requested By</Label>
                  <Input
                    value={requestedBy}
                    onChange={(e) => setRequestedBy(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-xs uppercase font-normal"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">Issued By</Label>
                  <Input
                    value={issuedBy}
                    onChange={(e) => setIssuedBy(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-xs uppercase font-normal"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">Received By</Label>
                  <Input
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-xs uppercase font-normal"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-slate-500">Date Returned</Label>
                  <Input
                    type="date"
                    value={dateReturned}
                    onChange={(e) => setDateReturned(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-xs font-normal"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-normal text-slate-500">
                    Total Consumption (Work Done)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Leave blank if not yet returned"
                    value={totalConsumption}
                    onChange={(e) => setTotalConsumption(e.target.value)}
                    className="bg-white border-slate-200 h-9 text-xs font-medium text-emerald-700"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 font-normal">Remarks (Optional)</Label>
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
              className="bg-dvla-green hover:bg-dvla-green-light text-white h-9 text-xs font-medium px-5 gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  {activeTab === "issue"
                    ? "Confirm & Issue"
                    : activeTab === "return"
                    ? "Save Consumption"
                    : "Save Changes"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
