"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

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

export default function AddConsumable() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

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

  useEffect(() => {
    async function loadData() {
      try {
        const [catsRes, statsRes, deptsRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/stations"),
          fetch("/api/departments"),
        ]);

        if (catsRes.ok) {
          const catsData = await catsRes.json();
          setCategories(catsData.data || []);
          if (catsData.data?.length > 0) {
            setCategoryId(String(catsData.data[0].id));
            generateCode(catsData.data[0].code_prefix || "CONS");
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
      } finally {
        setLoadingLookups(false);
      }
    }
    loadData();
  }, []);

  const generateCode = (prefix: string) => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    setItemCode(`${prefix.toUpperCase()}-${randomNum}`);
  };

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
        router.push("/consumables");
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving consumable record.");
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
            <h2 className="text-xl font-bold text-slate-900">Add Consumable Record</h2>
            <p className="text-sm text-slate-500">Create and register a new consumable item in the database.</p>
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
                <PlusCircle className="h-5 w-5 text-dvla-green" />
                Item Details & Stock Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select value={categoryId} onValueChange={handleCategoryChange} disabled={loadingLookups}>
                    <SelectTrigger id="category" className="bg-white">
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
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="itemCode" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Item Code <span className="text-red-500">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        const curCat = categories.find((c) => String(c.id) === categoryId);
                        generateCode(curCat?.code_prefix || "CONS");
                      }}
                      className="text-[11px] text-dvla-green hover:underline font-medium"
                    >
                      Regenerate
                    </button>
                  </div>
                  <Input
                    id="itemCode"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    placeholder="e.g. YMCK-001"
                    className="font-mono"
                    required
                  />
                </div>

                {/* Consumable Name */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="itemName" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Consumable Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="itemName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. YMCK Full-Color Ribbon 500 Images"
                    required
                  />
                </div>

                {/* Unit of Measure */}
                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Unit of Measure <span className="text-red-500">*</span>
                  </Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger id="unit" className="bg-white">
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

                {/* Station */}
                <div className="space-y-2">
                  <Label htmlFor="station" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Assigned Station
                  </Label>
                  <Select value={stationId} onValueChange={setStationId} disabled={loadingLookups}>
                    <SelectTrigger id="station" className="bg-white">
                      <SelectValue placeholder="Default (Head Office)" />
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
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Assigned Department
                  </Label>
                  <Select value={departmentId} onValueChange={setDepartmentId} disabled={loadingLookups}>
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

                {/* Initial Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="initialQty" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Initial Stock Quantity
                  </Label>
                  <Input
                    id="initialQty"
                    type="number"
                    min="0"
                    value={initialQuantity}
                    onChange={(e) => setInitialQuantity(e.target.value)}
                    placeholder="0"
                  />
                  <p className="text-[11px] text-slate-500">Automatically logs an opening inventory receipt.</p>
                </div>

                {/* Reorder Level */}
                <div className="space-y-2">
                  <Label htmlFor="reorder" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Reorder Alert Level <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="reorder"
                    type="number"
                    min="1"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                    placeholder="10"
                    required
                  />
                  <p className="text-[11px] text-slate-500">Low stock alert triggers when stock reaches this level.</p>
                </div>

                {/* Default Supplier */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="supplier" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Default Supplier / Manufacturer
                  </Label>
                  <Input
                    id="supplier"
                    value={supplierDefault}
                    onChange={(e) => setSupplierDefault(e.target.value)}
                    placeholder="e.g. Graphic Communications / Zebra Technologies"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Specifications / Description
                  </Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Technical specifications, part numbers, compatibility details..."
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
                disabled={submitting}
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
            </CardFooter>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}
