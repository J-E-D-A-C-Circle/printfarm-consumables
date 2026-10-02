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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Sparkles, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Category {
  id: number;
  name: string;
  code_prefix: string;
}

interface Station {
  id: number;
  name: string;
  region: string;
}

interface Department {
  id: number;
  name: string;
}

interface AddConsumableModalProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

export function AddConsumableModal({ children, onSuccess }: AddConsumableModalProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  // Form states
  const [itemCode, setItemCode] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState("Piece");
  const [stationId, setStationId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [initialQuantity, setInitialQuantity] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("10");
  const [maxStockLevel, setMaxStockLevel] = useState("1000");
  const [supplierDefault, setSupplierDefault] = useState("");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const generateCode = (prefix: string) => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    setItemCode(`${prefix.toUpperCase()}-${randomNum}`);
  };

  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(null);

      async function loadData() {
        setLoadingLookups(true);
        try {
          const [catsRes, statsRes, deptsRes] = await Promise.all([
            fetch("/api/categories"),
            fetch("/api/stations"),
            fetch("/api/departments"),
          ]);

          let catList: Category[] = [];
          if (catsRes.ok) {
            const catsData = await catsRes.json();
            catList = catsData.data || [];
            setCategories(catList);
            if (catList.length > 0 && !categoryId) {
              setCategoryId(String(catList[0].id));
              generateCode(catList[0].code_prefix || "CONS");
            }
          }
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            setStations(statsData.data || []);
          }
          if (deptsRes.ok) {
            const deptsData = await deptsRes.json();
            setDepartments(deptsData.data || []);
          }
        } catch (err) {
          console.error("Failed to load lookup data:", err);
          setError("Failed to load options from database.");
        } finally {
          setLoadingLookups(false);
        }
      }

      loadData();
    }
  }, [open]);

  const handleCategoryChange = (val: string) => {
    setCategoryId(val);
    const cat = categories.find((c) => String(c.id) === val);
    if (cat) {
      generateCode(cat.code_prefix || "CONS");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Please enter the consumable item name.");
      return;
    }
    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/consumables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_code: itemCode.trim() || undefined,
          name: name.trim(),
          category_id: Number(categoryId),
          unit,
          station_id: stationId ? Number(stationId) : null,
          department_id: departmentId ? Number(departmentId) : null,
          initial_quantity: parseInt(initialQuantity) || 0,
          reorder_level: parseInt(reorderLevel) || 0,
          max_stock_level: parseInt(maxStockLevel) || 9999,
          supplier_default: supplierDefault.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create consumable.");
      }

      setSuccess(`Consumable "${name}" created successfully (Code: ${data.item_code})!`);
      setTimeout(() => {
        setOpen(false);
        // Reset form
        setName("");
        setInitialQuantity("0");
        setSupplierDefault("");
        setDescription("");
        router.refresh();
        if (onSuccess) onSuccess();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving consumable record.");
    } finally {
      setSubmitting(false);
    }
  };

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
            <PlusCircle className="h-6 w-6 text-dvla-green" />
            Add Consumable Record
          </DialogTitle>
          <DialogDescription>
            Register a new consumable item, establish reorder levels, and optionally set initial stock quantity.
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

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="add-category" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select value={categoryId} onValueChange={handleCategoryChange} disabled={loadingLookups || submitting}>
                <SelectTrigger id="add-category" className="bg-white">
                  <SelectValue placeholder={loadingLookups ? "Loading categories..." : "Select category"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name} ({cat.code_prefix})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Item Code */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="add-itemCode" className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  Item Code <span className="text-red-500">*</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 font-medium px-1.5 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-blue-500" /> Auto
                  </span>
                </Label>
              </div>
              <div className="flex gap-2">
                <Input
                  id="add-itemCode"
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  placeholder="e.g. YMCK-001"
                  className="font-mono text-sm bg-slate-50 focus:bg-white"
                  disabled={submitting}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 text-slate-600 hover:text-slate-900"
                  title="Regenerate Item Code"
                  onClick={() => {
                    const curCat = categories.find((c) => String(c.id) === categoryId);
                    generateCode(curCat?.code_prefix || "CONS");
                  }}
                  disabled={submitting}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Consumable Name */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="add-itemName" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Consumable Item Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="add-itemName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. YMCK Full-Color Ribbon 500 Images"
                disabled={submitting}
                required
              />
            </div>

            {/* Unit of Measure */}
            <div className="space-y-1.5">
              <Label htmlFor="add-unit" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Unit of Measure <span className="text-red-500">*</span>
              </Label>
              <Select value={unit} onValueChange={setUnit} disabled={submitting}>
                <SelectTrigger id="add-unit" className="bg-white">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Roll">Roll</SelectItem>
                  <SelectItem value="Box">Box</SelectItem>
                  <SelectItem value="Piece">Piece / Card</SelectItem>
                  <SelectItem value="Pack">Pack</SelectItem>
                  <SelectItem value="Cartridge">Cartridge</SelectItem>
                  <SelectItem value="Ream">Ream</SelectItem>
                  <SelectItem value="Gallon">Gallon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Initial Quantity */}
            <div className="space-y-1.5">
              <Label htmlFor="add-initialQty" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Initial Stock Quantity
              </Label>
              <Input
                id="add-initialQty"
                type="number"
                min="0"
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(e.target.value)}
                placeholder="0"
                disabled={submitting}
              />
            </div>

            {/* Station */}
            <div className="space-y-1.5">
              <Label htmlFor="add-station" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Assigned Station (Optional)
              </Label>
              <Select value={stationId} onValueChange={setStationId} disabled={loadingLookups || submitting}>
                <SelectTrigger id="add-station" className="bg-white">
                  <SelectValue placeholder="Head Office / Central" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} ({s.region})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <Label htmlFor="add-department" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Assigned Department (Optional)
              </Label>
              <Select value={departmentId} onValueChange={setDepartmentId} disabled={loadingLookups || submitting}>
                <SelectTrigger id="add-department" className="bg-white">
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

            {/* Reorder Level */}
            <div className="space-y-1.5">
              <Label htmlFor="add-reorder" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Reorder Alert Level <span className="text-red-500">*</span>
              </Label>
              <Input
                id="add-reorder"
                type="number"
                min="1"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                placeholder="10"
                disabled={submitting}
                required
              />
            </div>

            {/* Max Stock Level */}
            <div className="space-y-1.5">
              <Label htmlFor="add-maxStock" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Max Target Stock Level
              </Label>
              <Input
                id="add-maxStock"
                type="number"
                min="1"
                value={maxStockLevel}
                onChange={(e) => setMaxStockLevel(e.target.value)}
                placeholder="1000"
                disabled={submitting}
              />
            </div>

            {/* Default Supplier */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="add-supplier" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Default Supplier / Manufacturer
              </Label>
              <Input
                id="add-supplier"
                value={supplierDefault}
                onChange={(e) => setSupplierDefault(e.target.value)}
                placeholder="e.g. Graphic Communications / Zebra Technologies"
                disabled={submitting}
              />
            </div>

            {/* Specifications / Description */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="add-description" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Specifications / Description
              </Label>
              <Input
                id="add-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Technical specifications, part numbers, compatibility details..."
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
              disabled={submitting || !name.trim() || !categoryId}
              className="bg-dvla-green hover:bg-dvla-green-light text-white font-semibold px-6 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Consumable Record"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
