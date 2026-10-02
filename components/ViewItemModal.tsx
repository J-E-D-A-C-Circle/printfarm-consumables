"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useCallback } from "react";
import { Eye, Package, FileSignature, CheckCircle2, PlusCircle, ChevronDown, ChevronUp } from "lucide-react";

interface BatchItem {
  id: number;
  batch_code: string;
  date_issued: string;
  issued_to: string;
  quantity_issued: number;
  status: "Pending" | "Reconciled" | "Voided";
  printed_cards: number;
  damaged_cards: number;
  recapture_cards: number;
}

interface ViewItemModalProps {
  children: React.ReactNode;
  item: any;
}

export function ViewItemModal({ children, item }: ViewItemModalProps) {
  const [open, setOpen] = useState(false);
  const [itemBatches, setItemBatches] = useState<BatchItem[]>([]);
  const [batchInputs, setBatchInputs] = useState<Record<number, { printed: string, damaged: string, recapture: string }>>({});
  const [submittingBatch, setSubmittingBatch] = useState<number | null>(null);

  // New Batch Form state
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [newIssuedTo, setNewIssuedTo] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newPrinted, setNewPrinted] = useState("");
  const [newDamaged, setNewDamaged] = useState("");
  const [newRecapture, setNewRecapture] = useState("");

  const loadBatches = useCallback(async () => {
    if (!item?.id) return;
    try {
      const res = await fetch(`/api/batches?consumable_id=${item.id}`);
      if (res.ok) {
        const d = await res.json();
        setItemBatches(d.data || []);
      }
    } catch (err) {
      console.error("Failed to load batches in ViewItemModal:", err);
    }
  }, [item?.id]);

  useEffect(() => {
    if (open) {
      loadBatches();
    }
  }, [open, loadBatches]);

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
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to reconcile batch.");
      }

      alert("Batch successfully reconciled!");
      loadBatches();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reconcile batch.");
    } finally {
      setSubmittingBatch(null);
    }
  };

  const handleAddNewBatch = async () => {
    if (!newIssuedTo || !newQty) {
      alert("Please enter Issued To unit and Quantity Issued.");
      return;
    }
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consumable_id: item.id,
          date_issued: new Date().toISOString().split('T')[0],
          issued_to: newIssuedTo,
          quantity_issued: parseInt(newQty) || 0,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create batch.");
      }

      const created = await res.json();

      // If initial numbers were provided, reconcile immediately
      if (newPrinted || newDamaged || newRecapture) {
        await fetch(`/api/batches/${created.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            printed_cards: parseInt(newPrinted) || 0,
            damaged_cards: parseInt(newDamaged) || 0,
            recapture_cards: parseInt(newRecapture) || 0,
          }),
        });
      }

      alert(`Card Production Batch ${created.batch_code} created successfully!`);
      setShowAddBatch(false);
      setNewIssuedTo("");
      setNewQty("");
      setNewPrinted("");
      setNewDamaged("");
      setNewRecapture("");
      loadBatches();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error creating batch.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden p-6 sm:p-8">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 pb-2 border-b">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-dvla-green" />
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">{item?.name}</DialogTitle>
                <p className="text-xs text-slate-500 font-mono">Item ID: {item?.id}</p>
              </div>
            </div>
            <Badge variant="outline" className={
              item?.status === "IN STOCK" 
                ? "bg-green-50 text-green-700 border-green-200"
                : item?.status === "LOW STOCK"
                ? "bg-orange-50 text-orange-700 border-orange-200"
                : "bg-red-50 text-red-700 border-red-200"
            }>
              {item?.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* SECTION 1: ITEM DETAILS */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border">
              <div className="h-12 w-12 rounded-full bg-dvla-green/10 flex items-center justify-center shrink-0">
                <Package className="h-6 w-6 text-dvla-green" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{item?.name}</h3>
                <p className="text-sm text-slate-500">{item?.category}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white p-3 rounded-lg border">
                <span className="text-slate-500 block text-xs mb-1">Target Station</span>
                <span className="font-semibold text-slate-900">{item?.station}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <span className="text-slate-500 block text-xs mb-1">Department</span>
                <span className="font-semibold text-slate-900">{item?.department}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <span className="text-slate-500 block text-xs mb-1">Reorder Level</span>
                <span className="font-semibold text-slate-900">{item?.reorderLevel ?? item?.reorder_level ?? 0} {item?.unit}s</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border">
                <span className="text-slate-500 block text-xs mb-1">Total Received</span>
                <span className="font-bold text-slate-900 text-base">{item?.received ?? 0} {item?.unit}s</span>
              </div>
              <div className="bg-orange-50/50 p-3 rounded-lg border border-orange-100">
                <span className="text-slate-500 block text-xs mb-1">Total Issued</span>
                <span className="font-bold text-orange-600 text-base">{item?.issued ?? 0} {item?.unit}s</span>
              </div>
              <div className="bg-green-50/50 p-3 rounded-lg border border-green-100">
                <span className="text-slate-500 block text-xs mb-1">Current Balance</span>
                <span className="font-bold text-dvla-green text-lg">{item?.balance ?? 0} {item?.unit}s</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: YIELD RECONCILIATION */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between bg-blue-50/80 p-3 rounded-lg border border-blue-200 text-xs text-blue-900">
              <div className="flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-sm">Yield & Production Reconciliation</span>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs gap-1 bg-white text-blue-700 border-blue-300 hover:bg-blue-100"
                onClick={() => setShowAddBatch(!showAddBatch)}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                {showAddBatch ? "Cancel" : "Add Reconciliation Batch"}
                {showAddBatch ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>

            {/* Form to add a new card production batch for reconciliation */}
            {showAddBatch && (
              <div className="bg-blue-50/40 p-4 rounded-lg border border-blue-200 space-y-3">
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">Record New Production Batch</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-700 font-medium">Issued To (Unit / Location) <span className="text-red-500">*</span></Label>
                    <Input 
                      placeholder="e.g. Card Production Unit, External Vendor" 
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
                </div>
                <div className="grid grid-cols-3 gap-3 pt-1">
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
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs" onClick={handleAddNewBatch}>
                    Save Reconciliation Batch
                  </Button>
                </div>
              </div>
            )}

            {itemBatches.length === 0 && !showAddBatch ? (
              <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed text-slate-500 space-y-2">
                <FileSignature className="h-6 w-6 text-slate-400 mx-auto" />
                <p className="font-medium text-slate-700 text-xs">No active card production batches recorded yet for {item?.name}.</p>
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
                    <div key={batch.id} className={`p-4 rounded-lg border ${isPending ? 'bg-white border-blue-200 shadow-xs' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-slate-900">{batch.batch_code}</h4>
                          <p className="text-xs text-slate-500">Issued to: {batch.issued_to} on {batch.date_issued?.split("T")[0]}</p>
                        </div>
                        <Badge variant="outline" className={isPending ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-green-50 text-green-700 border-green-200"}>
                          {batch.status}
                        </Badge>
                      </div>

                      <div className="mb-3 pt-3 border-t flex justify-between items-center text-xs">
                        <span className="text-slate-600">Total Quantity Issued:</span>
                        <span className="font-bold text-slate-900 text-sm">{batch.quantity_issued} units</span>
                      </div>

                      {isPending ? (
                        <div className="space-y-3 pt-2">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={`view-printed-${batch.id}`} className="text-xs text-slate-600 font-medium">Printed Cards</Label>
                              <Input 
                                id={`view-printed-${batch.id}`}
                                type="number" 
                                min="0"
                                placeholder="0"
                                value={inputs.printed}
                                onChange={(e) => handleInputChange(batch.id, 'printed', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`view-damaged-${batch.id}`} className="text-xs text-slate-600 font-medium">Damaged (Spoilage)</Label>
                              <Input 
                                id={`view-damaged-${batch.id}`}
                                type="number" 
                                min="0"
                                placeholder="0"
                                value={inputs.damaged}
                                onChange={(e) => handleInputChange(batch.id, 'damaged', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`view-recapture-${batch.id}`} className="text-xs text-slate-600 font-medium">Recapture Cards</Label>
                              <Input 
                                id={`view-recapture-${batch.id}`}
                                type="number" 
                                min="0"
                                placeholder="0"
                                value={inputs.recapture}
                                onChange={(e) => handleInputChange(batch.id, 'recapture', e.target.value)}
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
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close Window
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

