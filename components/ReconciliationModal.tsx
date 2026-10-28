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
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileSignature,
  CheckCircle2,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  X,
  AlertCircle,
  Clock,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BatchItem {
  id: number;
  batch_code: string;
  issue_id?: number | null;
  issue_reference?: string | null;
  date_issued: string;
  issued_to: string;
  quantity_issued: number;
  expected_quantity?: number;
  status: "Pending" | "Reconciled" | "Voided";
  printed_cards: number;
  damaged_cards: number;
  recapture_cards: number;
  unaccounted: number;
  yield_percentage?: number | null;
  waste_percentage?: number | null;
  notes?: string | null;
  reason_for_damage?: string | null;
  date_of_reconciliation?: string | null;
}

interface ReconciliationModalProps {
  children: React.ReactNode;
  item: {
    id: number;
    name: string;
    item_code?: string;
  };
  issueRecord?: {
    id: number;
    reference_number: string;
    quantity: number;
    expected_quantity?: number;
    to_station?: string | null;
    receiving_officer?: string | null;
    batch_id?: number | null;
  };
  onSuccess?: () => void;
}

export function ReconciliationModal({ children, item, issueRecord, onSuccess }: ReconciliationModalProps) {
  const [open, setOpen] = useState(false);
  const [itemBatches, setItemBatches] = useState<BatchItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Editing state for already existing / reconciled batches: batchId -> isEditing
  const [editingBatchId, setEditingBatchId] = useState<number | null>(null);

  // Inputs for batch editing/reconciliation: batchId -> values
  const [batchInputs, setBatchInputs] = useState<
    Record<number, { printed: string; damaged: string; recapture: string; notes: string }>
  >({});
  const [submittingBatch, setSubmittingBatch] = useState<number | null>(null);

  // New Batch Form state (for standalone batch or when no batch exists for dispatch)
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [newIssuedTo, setNewIssuedTo] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newExpectedQty, setNewExpectedQty] = useState("");
  const [newPrinted, setNewPrinted] = useState("");
  const [newDamaged, setNewDamaged] = useState("");
  const [newRecapture, setNewRecapture] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [addingBatch, setAddingBatch] = useState(false);

  const loadBatches = useCallback(async () => {
    if (!item?.id) return;
    setLoadingBatches(true);
    try {
      const url = issueRecord?.id
        ? `/api/batches?issue_id=${issueRecord.id}&_t=${Date.now()}`
        : `/api/batches?consumable_id=${item.id}&_t=${Date.now()}`;
      
      const res = await fetch(url, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });

      if (res.ok) {
        const d = await res.json();
        let batches: BatchItem[] = d.data || [];

        // If queried by issue_id and nothing returned, fall back to checking consumable batches
        if (issueRecord?.id && batches.length === 0) {
          const fallbackRes = await fetch(`/api/batches?consumable_id=${item.id}&_t=${Date.now()}`);
          if (fallbackRes.ok) {
            const fd = await fallbackRes.json();
            const allForConsumable: BatchItem[] = fd.data || [];
            // Try matching by issue_id or issueRecord.batch_id
            const matched = allForConsumable.filter(
              (b) => b.issue_id === issueRecord.id || (issueRecord.batch_id && b.id === issueRecord.batch_id)
            );
            batches = matched;
          }
        }

        setItemBatches(batches);

        // Populate initial input values
        const initialInputs: Record<number, { printed: string; damaged: string; recapture: string; notes: string }> = {};
        batches.forEach((b) => {
          initialInputs[b.id] = {
            printed: b.printed_cards ? String(b.printed_cards) : "",
            damaged: b.damaged_cards ? String(b.damaged_cards) : "",
            recapture: b.recapture_cards ? String(b.recapture_cards) : "",
            notes: b.notes || "",
          };
        });
        setBatchInputs(initialInputs);

        // If opened for a specific issue record and no batch exists yet, auto-show the creation form
        if (issueRecord && batches.length === 0) {
          setShowAddBatch(true);
        } else {
          setShowAddBatch(false);
        }
      }
    } catch (err) {
      console.error("Failed to load item batches:", err);
    } finally {
      setLoadingBatches(false);
    }
  }, [item?.id, issueRecord]);

  useEffect(() => {
    if (open) {
      if (issueRecord) {
        setNewIssuedTo(issueRecord.to_station || issueRecord.receiving_officer || "Production Unit");
        setNewQty(String(issueRecord.quantity || ""));
        setNewExpectedQty(String(issueRecord.expected_quantity || issueRecord.quantity || ""));
        setNewPrinted("");
        setNewDamaged("");
        setNewRecapture("");
        setNewNotes("");
      }
      loadBatches();
    } else {
      setEditingBatchId(null);
      setShowAddBatch(false);
    }
  }, [open, issueRecord, loadBatches]);

  const handleInputChange = (
    batchId: number,
    field: "printed" | "damaged" | "recapture" | "notes",
    value: string
  ) => {
    setBatchInputs((prev) => ({
      ...prev,
      [batchId]: {
        ...(prev[batchId] || { printed: "", damaged: "", recapture: "", notes: "" }),
        [field]: value,
      },
    }));
  };

  const handleReconcile = async (batchId: number) => {
    setSubmittingBatch(batchId);
    try {
      const input = batchInputs[batchId] || { printed: "0", damaged: "0", recapture: "0", notes: "" };
      const printed = parseInt(input.printed) || 0;
      const damaged = parseInt(input.damaged) || 0;
      const recapture = parseInt(input.recapture) || 0;

      const res = await fetch(`/api/batches/${batchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          printed_cards: printed,
          damaged_cards: damaged,
          recapture_cards: recapture,
          notes: input.notes,
          date_of_reconciliation: new Date().toISOString().split("T")[0],
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save reconciliation.");
      }

      await loadBatches();
      setEditingBatchId(null);
      alert("Work done reconciliation saved successfully!");
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error saving reconciliation.");
    } finally {
      setSubmittingBatch(null);
    }
  };

  const handleAddNewBatch = async () => {
    const qty = parseInt(newQty) || (issueRecord ? issueRecord.quantity : 0);
    const recipient = newIssuedTo || (issueRecord ? (issueRecord.to_station || issueRecord.receiving_officer || "Station Officer") : "");

    if (!recipient || !qty) {
      alert("Please enter Issued To recipient and Quantity Issued.");
      return;
    }

    setAddingBatch(true);
    try {
      const printed = parseInt(newPrinted) || 0;
      const damaged = parseInt(newDamaged) || 0;
      const recapture = parseInt(newRecapture) || 0;
      const expQty = parseInt(newExpectedQty) || qty;

      const isReconciled = printed > 0 || damaged > 0 || recapture > 0;

      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consumable_id: item.id,
          issue_id: issueRecord?.id || null,
          date_issued: new Date().toISOString().split("T")[0],
          issued_to: recipient,
          quantity_issued: qty,
          expected_quantity: expQty,
          printed_cards: printed,
          damaged_cards: damaged,
          recapture_cards: recapture,
          notes: newNotes,
          status: isReconciled ? "Reconciled" : "Pending",
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create reconciliation batch.");
      }

      await loadBatches();
      setShowAddBatch(false);
      alert("Work done reconciliation saved successfully!");
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error saving batch.");
    } finally {
      setAddingBatch(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl w-full max-h-[88vh] overflow-y-auto overflow-x-hidden p-6 sm:p-8">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <FileSignature className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Work Done & Production Reconciliation
                </DialogTitle>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  <span className="font-semibold text-slate-700">{item.name}</span>
                  {issueRecord ? ` — Dispatch Ref: #${issueRecord.reference_number}` : ""}
                </p>
              </div>
            </div>
            {!issueRecord && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1 bg-white text-blue-700 border-blue-300 hover:bg-blue-100 shrink-0"
                onClick={() => setShowAddBatch(!showAddBatch)}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                {showAddBatch ? "Cancel" : "Add Reconciliation Batch"}
                {showAddBatch ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="py-2 space-y-4 max-w-full overflow-x-hidden">
          {/* Form to record/create work done */}
          {showAddBatch && (
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-blue-600" />
                  {issueRecord ? "Record Work Done for this Dispatch" : "Record New Production Batch"}
                </h4>
                {issueRecord && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 text-[11px]">
                    Dispatch Ref #{issueRecord.reference_number}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">
                    Issued To (Unit / Station) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Card Production Unit"
                    value={newIssuedTo}
                    onChange={(e) => setNewIssuedTo(e.target.value)}
                    className="bg-white text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">
                    Quantity Issued <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    className="bg-white text-xs h-8 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">Expected Card Output</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Expected cards"
                    value={newExpectedQty}
                    onChange={(e) => setNewExpectedQty(e.target.value)}
                    className="bg-white text-xs h-8 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-blue-100">
                <p className="text-xs font-bold text-slate-800 mb-2">Work Done & Output Metrics</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-700 font-medium">Printed Cards (Good)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={newPrinted}
                      onChange={(e) => setNewPrinted(e.target.value)}
                      className="bg-white text-xs h-8 font-mono font-bold text-green-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-700 font-medium">Damaged Cards (Spoilage)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={newDamaged}
                      onChange={(e) => setNewDamaged(e.target.value)}
                      className="bg-white text-xs h-8 font-mono font-bold text-orange-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-700 font-medium">Recaptured Cards</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={newRecapture}
                      onChange={(e) => setNewRecapture(e.target.value)}
                      className="bg-white text-xs h-8 font-mono font-bold text-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <Label className="text-xs text-slate-700 font-medium">Notes / Damage Reason (Optional)</Label>
                <Input
                  placeholder="e.g. Printer calibration error, defect ribbons, clean batch"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="bg-white text-xs h-8"
                />
              </div>

              <div className="flex justify-end pt-2 gap-2">
                {!issueRecord && (
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowAddBatch(false)}>
                    Cancel
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={addingBatch || !newQty}
                  className="bg-dvla-green hover:bg-dvla-green-light text-white h-8 text-xs font-semibold px-4 gap-1.5"
                  onClick={handleAddNewBatch}
                >
                  <Save className="h-3.5 w-3.5" />
                  {addingBatch ? "Saving Work Done..." : "Save Work Done & Reconcile"}
                </Button>
              </div>
            </div>
          )}

          {loadingBatches ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed text-slate-500 text-xs">
              Loading reconciliation records...
            </div>
          ) : itemBatches.length === 0 && !showAddBatch ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed space-y-3">
              <FileSignature className="h-9 w-9 text-slate-400 mx-auto" />
              <p className="text-slate-700 font-semibold text-sm">No reconciliation batch found for this record.</p>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-dvla-green hover:bg-dvla-green-light text-white"
                onClick={() => setShowAddBatch(true)}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Record Work Done Now
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {itemBatches.map((batch) => {
                const isPending = batch.status === "Pending";
                const isEditing = editingBatchId === batch.id;
                const inputs = batchInputs[batch.id] || {
                  printed: String(batch.printed_cards || ""),
                  damaged: String(batch.damaged_cards || ""),
                  recapture: String(batch.recapture_cards || ""),
                  notes: batch.notes || "",
                };

                const calcYield = batch.yield_percentage !== null && batch.yield_percentage !== undefined
                  ? `${batch.yield_percentage}%`
                  : batch.quantity_issued > 0 && batch.printed_cards > 0
                  ? `${((batch.printed_cards / batch.quantity_issued) * 100).toFixed(1)}%`
                  : "0%";

                const calcWaste = batch.waste_percentage !== null && batch.waste_percentage !== undefined
                  ? `${batch.waste_percentage}%`
                  : batch.quantity_issued > 0 && batch.damaged_cards > 0
                  ? `${((batch.damaged_cards / batch.quantity_issued) * 100).toFixed(1)}%`
                  : "0%";

                return (
                  <div
                    key={batch.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isPending
                        ? "bg-amber-50/30 border-amber-200"
                        : "bg-white shadow-xs border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Header: Batch Code & Status */}
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm font-mono">{batch.batch_code}</h4>
                          {batch.issue_reference && (
                            <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-700">
                              Ref #{batch.issue_reference}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Issued to: <span className="font-medium text-slate-700">{batch.issued_to}</span> on{" "}
                          {batch.date_issued ? batch.date_issued.slice(0, 10) : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            isPending
                              ? "bg-amber-100 text-amber-800 border-amber-300 font-semibold"
                              : "bg-green-100 text-green-800 border-green-300 font-semibold flex items-center gap-1"
                          }
                        >
                          {isPending ? (
                            <>
                              <Clock className="h-3 w-3" /> Pending
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-green-600" /> Reconciled
                            </>
                          )}
                        </Badge>
                        {!isPending && !isEditing && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-blue-600 hover:bg-blue-50 gap-1 px-2"
                            onClick={() => {
                              setEditingBatchId(batch.id);
                              setBatchInputs((prev) => ({
                                ...prev,
                                [batch.id]: {
                                  printed: String(batch.printed_cards || "0"),
                                  damaged: String(batch.damaged_cards || "0"),
                                  recapture: String(batch.recapture_cards || "0"),
                                  notes: batch.notes || "",
                                },
                              }));
                            }}
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Edit
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Stats summary banner */}
                    <div className="mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Quantity Issued</span>
                        <span className="font-bold text-slate-900 font-mono text-sm">{batch.quantity_issued}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Expected Cards</span>
                        <span className="font-bold text-blue-700 font-mono text-sm">
                          {batch.expected_quantity || batch.quantity_issued}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Yield Rate</span>
                        <span className="font-bold text-green-700 font-mono text-sm">{calcYield}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Waste Rate</span>
                        <span className="font-bold text-orange-600 font-mono text-sm">{calcWaste}</span>
                      </div>
                    </div>

                    {/* Pending form OR Active Editing mode */}
                    {isPending || isEditing ? (
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor={`printed-${batch.id}`} className="text-xs text-slate-700 font-semibold">
                              Printed Cards (Good) <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`printed-${batch.id}`}
                              type="number"
                              min="0"
                              placeholder="0"
                              value={inputs.printed}
                              onChange={(e) => handleInputChange(batch.id, "printed", e.target.value)}
                              className="bg-white text-xs h-8 font-mono font-bold text-green-700"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`damaged-${batch.id}`} className="text-xs text-slate-700 font-semibold">
                              Damaged Cards (Spoilage)
                            </Label>
                            <Input
                              id={`damaged-${batch.id}`}
                              type="number"
                              min="0"
                              placeholder="0"
                              value={inputs.damaged}
                              onChange={(e) => handleInputChange(batch.id, "damaged", e.target.value)}
                              className="bg-white text-xs h-8 font-mono font-bold text-orange-600"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`recapture-${batch.id}`} className="text-xs text-slate-700 font-semibold">
                              Recaptured Cards
                            </Label>
                            <Input
                              id={`recapture-${batch.id}`}
                              type="number"
                              min="0"
                              placeholder="0"
                              value={inputs.recapture}
                              onChange={(e) => handleInputChange(batch.id, "recapture", e.target.value)}
                              className="bg-white text-xs h-8 font-mono font-bold text-blue-600"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor={`notes-${batch.id}`} className="text-xs text-slate-600 font-medium">
                            Notes / Damage Reason (Optional)
                          </Label>
                          <Input
                            id={`notes-${batch.id}`}
                            placeholder="e.g. Printer jam on station, defective batch"
                            value={inputs.notes}
                            onChange={(e) => handleInputChange(batch.id, "notes", e.target.value)}
                            className="bg-white text-xs h-8"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          {isEditing && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs"
                              onClick={() => setEditingBatchId(null)}
                            >
                              <X className="h-3.5 w-3.5 mr-1" /> Cancel
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleReconcile(batch.id)}
                            disabled={submittingBatch === batch.id || (!inputs.printed && !inputs.damaged && !inputs.recapture)}
                            className="bg-dvla-green hover:bg-dvla-green-light text-white text-xs h-8 font-semibold px-4 gap-1.5"
                          >
                            <Save className="h-3.5 w-3.5" />
                            {submittingBatch === batch.id
                              ? "Saving..."
                              : isEditing
                              ? "Update Reconciliation"
                              : "Submit Reconciliation"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Display Reconciled Summary */
                      <div className="pt-2 border-t border-slate-100">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-slate-500 block mb-0.5">Printed (Good)</span>
                            <span className="font-bold text-green-700 flex items-center gap-1 font-mono text-sm">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              {batch.printed_cards}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block mb-0.5">Damaged (Waste)</span>
                            <span className="font-bold text-orange-600 font-mono text-sm">
                              {batch.damaged_cards}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block mb-0.5">Recaptured</span>
                            <span className="font-bold text-blue-600 font-mono text-sm">
                              {batch.recapture_cards}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block mb-0.5">Unaccounted</span>
                            <span className="font-bold text-slate-700 font-mono text-sm">
                              {batch.unaccounted ?? 0}
                            </span>
                          </div>
                        </div>

                        {(batch.notes || batch.reason_for_damage) && (
                          <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="font-semibold text-slate-700">Notes: </span>
                            {[batch.reason_for_damage, batch.notes].filter(Boolean).join(" | ")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
