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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react";
import { Edit2 } from "lucide-react";

interface CategoryOption {
  id: number;
  name: string;
}

interface StationOption {
  id: number;
  name: string;
}

interface DepartmentOption {
  id: number;
  name: string;
}

interface EditItemModalProps {
  children: React.ReactNode;
  item: any;
  onSuccess?: () => void;
}

export function EditItemModal({ children, item, onSuccess }: EditItemModalProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [categoriesList, setCategoriesList] = useState<CategoryOption[]>([]);
  const [stationsList, setStationsList] = useState<StationOption[]>([]);
  const [departmentsList, setDepartmentsList] = useState<DepartmentOption[]>([]);

  // Initialize form data with item data
  const [formData, setFormData] = useState({
    name: item?.name || "",
    category: item?.category || "",
    station: item?.station || "",
    department: item?.department || "",
    reorderLevel: item?.reorderLevel?.toString() || item?.reorder_level?.toString() || "0",
  });

  const loadOptions = useCallback(async () => {
    try {
      const [catsRes, statsRes, deptsRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/stations"),
        fetch("/api/departments"),
      ]);
      if (catsRes.ok) {
        const d = await catsRes.json();
        setCategoriesList(d.data || []);
      }
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStationsList(d.data || []);
      }
      if (deptsRes.ok) {
        const d = await deptsRes.json();
        setDepartmentsList(d.data || []);
      }
    } catch (err) {
      console.error("Failed to load options in EditItemModal:", err);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadOptions();
      if (item) {
        setFormData({
          name: item.name || "",
          category: item.category || "",
          station: item.station || "",
          department: item.department || "",
          reorderLevel: (item.reorderLevel ?? item.reorder_level ?? 0).toString(),
        });
      }
    }
  }, [open, item, loadOptions]);

  const handleSave = async () => {
    if (!item?.id) return;
    setIsSaving(true);
    try {
      const selectedCat = categoriesList.find(c => c.name === formData.category);
      const selectedStat = stationsList.find(s => s.name === formData.station);
      const selectedDept = departmentsList.find(d => d.name === formData.department);

      const res = await fetch(`/api/consumables/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          category_id: selectedCat?.id,
          station_id: selectedStat?.id,
          department_id: selectedDept?.id,
          reorder_level: parseInt(formData.reorderLevel) || 0,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update consumable.");
      }

      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error updating item.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden p-6 sm:p-8" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 pb-2 border-b">
            <Edit2 className="h-5 w-5 text-dvla-gold" />
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">Update Consumable</DialogTitle>
              <p className="text-xs text-slate-500 font-normal">{item?.name}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Input 
                id="itemName" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="bg-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(val) => setFormData({...formData, category: val})}
              >
                <SelectTrigger id="category" className="bg-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesList.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="station">Target Station</Label>
              <Select 
                value={formData.station} 
                onValueChange={(val) => setFormData({...formData, station: val})}
              >
                <SelectTrigger id="station" className="bg-white">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  {stationsList.map(s => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select 
                value={formData.department} 
                onValueChange={(val) => setFormData({...formData, department: val})}
              >
                <SelectTrigger id="department" className="bg-white">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departmentsList.map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorder">Reorder Level Threshold</Label>
              <Input 
                id="reorder" 
                type="number" 
                min="0"
                value={formData.reorderLevel}
                onChange={(e) => setFormData({...formData, reorderLevel: e.target.value})}
                className="bg-white"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 border-t pt-3">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-dvla-gold hover:bg-dvla-gold-hover text-slate-900 font-semibold px-6">
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

