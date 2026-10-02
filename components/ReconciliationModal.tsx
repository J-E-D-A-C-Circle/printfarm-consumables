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
import { useState } from "react";
import { FileSignature, CheckCircle2, PlusCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useCallback } from "react";

interface BatchItem {
  id: number;
  batch_code: string;
  date_issued: string;
  issued_to: string;
  quantity_issued: number;
  expected_quantity?: number;
  status: "Pending" | "Reconciled" | "Voided";
  printed_cards: number;
  damaged_cards: number;
  recapture_cards: number;
  unaccounted: number;
  yield_percentage?: number;
  waste_percentage?: number;
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
  
  // Track inputs for each pending batch
  const [batchInputs, setBatchInputs] = useState<Record<number, { printed: string, damaged: string, recapture: string }>>({});
  const [submittingBatch, setSubmittingBatch] = useState<number | null>(null);

  // New Batch Form state
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [newIssuedTo, setNewIssuedTo] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newExpectedQty, setNewExpectedQty] = useState("");
  const [newPrinted, setNewPrinted] = useState("");
  const [newDamaged, setNewDamaged] = useState("");
  const [newRecapture, setNewRecapture] = useState("");
  const [addingBatch, setAddingBatch] = useState(false);

  const loadBatches = useCallback(async () => {
    if (!item?.id) return;
    setLoadingBatches(true);
    try {
      const res = await fetch(`/api/batches?consumable_id=${item.id}`);
      if (res.ok) {
        const d = await res.json();
        const batches: BatchItem[] = d.data || [];
        setItemBatches(batches);

        // If opened for a specific issue record and no batch exists yet, prepare add batch form
        if (issueRecord && batches.length === 0) {
          setShowAddBatch(true);
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
      }
      loadBatches();
    }
  }, [open, issueRecord, loadBatches]);

  const handleInputChange = (batchId: number, field: 'printed' | 'damaged' | 'recapture', value: string) => {
    setBatchInputs(prev => ({
      ...prev,
      [batchId]: {
        ...prev[batchId],
        [field]: value
      }
    }));
  };

  const handleReconcile = async (batchId: number) => {
    setSubmittingBatch(batchId);
    try {
      const input = batchInputs[batchId] || { printed: "0", damaged: "0", recapture: "0" };
      const res = await fetch(`/api/batches/${batchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          printed_cards: parseInt(input.printed) || 0,
          damaged_cards: parseInt(input.damaged) || 0,
          recapture_cards: parseInt(input.recapture) || 0,
          date_of_reconciliation: new Date().toISOString().split('T')[0],
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to reconcile batch.");
      }

      await loadBatches();
      alert(`Batch reconciled successfully!`);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error reconciling batch.");
    } finally {
      setSubmittingBatch(null);
    }
  };

  const handleAddNewBatch = async () => {
    if (!newIssuedTo || !newQty) {
      alert("Please enter Issued To unit and Quantity Issued.");
      return;
    }
    setAddingBatch(true);
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consumable_id: item.id,
          issue_id: issueRecord?.id || null,
          date_issued: new Date().toISOString().split('T')[0],
          issued_to: newIssuedTo,
          quantity_issued: parseInt(newQty) || 0,
          expected_quantity: parseInt(newExpectedQty) || parseInt(newQty) || 0,
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create batch.");
      }

      await loadBatches();
      setShowAddBatch(false);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error creating batch.");
    } finally {
      setAddingBatch(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl w-full max-h-[88vh] overflow-y-auto overflow-x-hidden p-6 sm:p-8">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <FileSignature className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">Yield & Production Reconciliation</DialogTitle>
                <p className="text-sm text-slate-500 font-normal">
                  {item.name} {issueRecord ? `— Dispatch Ref: ${issueRecord.reference_number}` : ""}
                </p>
              </div>
            </div>
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
          </div>
        </DialogHeader>
        
        <div className="py-2 space-y-4 max-w-full overflow-x-hidden">
          {/* Form to add a new card production batch */}
          {showAddBatch && (
            <div className="bg-blue-50/40 p-4 rounded-lg border border-blue-200 space-y-3">
              <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">Record New Production Batch</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">Issued To (Unit / Location) <span className="text-red-500">*</span></Label>
                  <Input 
                    placeholder="e.g. Card Production Unit" 
                    value={newIssuedTo}
                    onChange={(e) => setNewIssuedTo(e.target.value)}
                    className="bg-white text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">Quantity Issued <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    min="1"
                    placeholder="0" 
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    className="bg-white text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">Expected Card Output <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number"
                    min="0"
                    placeholder="Expected cards" 
                    value={newExpectedQty}
                    onChange={(e) => setNewExpectedQty(e.target.value)}
                    className="bg-white text-xs h-8"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">Printed Cards</Label>
                  <Input 
                    type="number"
                    min="0"
                    placeholder="0" 
                    value={newPrinted}
                    onChange={(e) => setNewPrinted(e.target.value)}
                    className="bg-white text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">Damaged Cards</Label>
                  <Input 
                    type="number"
                    min="0"
                    placeholder="0" 
                    value={newDamaged}
                    onChange={(e) => setNewDamaged(e.target.value)}
                    className="bg-white text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">Recapture Cards</Label>
                  <Input 
                    type="number"
                    min="0"
                    placeholder="0" 
                    value={newRecapture}
                    onChange={(e) => setNewRecapture(e.target.value)}
                    className="bg-white text-xs h-8"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2 gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddBatch(false)}>Cancel</Button>
                <Button size="sm" disabled={addingBatch} className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs" onClick={handleAddNewBatch}>
                  {addingBatch ? "Saving..." : "Save Reconciliation Batch"}
                </Button>
              </div>
            </div>
          )}

          {itemBatches.length === 0 && !showAddBatch ? (
            <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed space-y-2">
              <FileSignature className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-slate-700 font-medium text-sm">No card production batches found for {item.name}.</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 text-xs gap-1 text-blue-700 border-blue-300 bg-white hover:bg-blue-50"
                onClick={() => setShowAddBatch(true)}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Add First Reconciliation Batch
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {itemBatches.map(batch => {
                const isPending = batch.status === "Pending";
                const inputs = batchInputs[batch.id] || { printed: "", damaged: "", recapture: "" };
                
                return (
                  <div key={batch.id} className={`p-4 rounded-lg border ${isPending ? 'bg-white shadow-xs border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900">{batch.batch_code}</h4>
                        <p className="text-xs text-slate-500">Issued to: {batch.issued_to} on {batch.date_issued ? batch.date_issued.slice(0, 10) : "—"}</p>
                      </div>
                      <Badge variant="outline" className={isPending ? "bg-orange-50 text-orange-700 border-orange-200 shrink-0" : "bg-green-50 text-green-700 border-green-200 shrink-0"}>
                        {batch.status}
                      </Badge>
                    </div>

                    <div className="mb-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 text-xs gap-2 bg-slate-50 p-2.5 rounded border border-slate-100">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Quantity Issued:</span>
                        <span className="font-bold text-slate-900 text-sm">{batch.quantity_issued} units</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Expected Card Output:</span>
                        <span className="font-bold text-blue-700 text-sm">{batch.expected_quantity || batch.quantity_issued} cards</span>
                      </div>
                    </div>

                    {isPending ? (
                      <div className="space-y-3 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor={`printed-${batch.id}`} className="text-xs text-slate-600 font-medium">Printed Cards</Label>
                            <Input 
                              id={`printed-${batch.id}`}
                              type="number" 
                              min="0"
                              placeholder="0"
                              value={inputs.printed}
                              onChange={(e) => handleInputChange(batch.id, 'printed', e.target.value)}
                              className="bg-white text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`damaged-${batch.id}`} className="text-xs text-slate-600 font-medium">Damaged (Spoilage)</Label>
                            <Input 
                              id={`damaged-${batch.id}`}
                              type="number" 
                              min="0"
                              placeholder="0"
                              value={inputs.damaged}
                              onChange={(e) => handleInputChange(batch.id, 'damaged', e.target.value)}
                              className="bg-white text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`recapture-${batch.id}`} className="text-xs text-slate-600 font-medium">Recapture Cards</Label>
                            <Input 
                              id={`recapture-${batch.id}`}
                              type="number" 
                              min="0"
                              placeholder="0"
                              value={inputs.recapture}
                              onChange={(e) => handleInputChange(batch.id, 'recapture', e.target.value)}
                              className="bg-white text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end pt-1">
                          <Button 
                            size="sm"
                            onClick={() => handleReconcile(batch.id)} 
                            disabled={submittingBatch === batch.id || (!inputs.printed && !inputs.damaged && !inputs.recapture)}
                            className="bg-dvla-green hover:bg-dvla-green-light text-white text-xs h-8"
                          >
                            {submittingBatch === batch.id ? "Submitting..." : "Submit Reconciliation"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-3 border-t grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block mb-0.5">Printed Cards</span>
                          <span className="font-semibold text-slate-900 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            {batch.printed_cards}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-0.5">Damaged</span>
                          <span className="font-semibold text-orange-600">{batch.damaged_cards}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block mb-0.5">Recapture</span>
                          <span className="font-semibold text-blue-600">{batch.recapture_cards}</span>
                        </div>
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
