"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileDown, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    setIsUploading(true);
    // Simulate upload delay
    setTimeout(() => {
      setIsUploading(false);
      setShowPreview(true);
    }, 1500);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Import Records</h2>
          <p className="text-sm text-slate-500">Upload an Excel file to bulk import consumables data.</p>
        </div>

        {!showPreview ? (
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-dvla-green" />
                  Upload Excel File
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Download Template
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-10 pb-10">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center hover:bg-slate-50 transition-colors">
                <div className="mx-auto h-12 w-12 rounded-full bg-dvla-green/10 flex items-center justify-center mb-4">
                  <Upload className="h-6 w-6 text-dvla-green" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">Click to upload or drag and drop</h3>
                <p className="text-sm text-slate-500 mb-4">XLSX, XLS or CSV (max. 10MB)</p>
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileChange}
                />
                <Button asChild variant="outline">
                  <label htmlFor="file-upload" className="cursor-pointer">Select File</label>
                </Button>
                
                {file && (
                  <div className="mt-4 p-3 bg-slate-100 rounded-lg flex items-center justify-between max-w-sm mx-auto">
                    <span className="text-sm font-medium truncate">{file.name}</span>
                    <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-end py-4">
              <Button 
                className="bg-dvla-green hover:bg-dvla-green-light text-white" 
                disabled={!file || isUploading}
                onClick={handleUpload}
              >
                {isUploading ? "Processing..." : "Preview Data"}
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-base font-semibold">Data Validation Preview</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex gap-4 mb-6">
                <div className="bg-green-50 text-green-700 p-3 rounded-lg border border-green-200 flex-1 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5" />
                  <div>
                    <div className="font-bold">45 Records Valid</div>
                    <div className="text-xs opacity-90">Ready to import</div>
                  </div>
                </div>
                <div className="bg-orange-50 text-orange-700 p-3 rounded-lg border border-orange-200 flex-1 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5" />
                  <div>
                    <div className="font-bold">2 Issues Found</div>
                    <div className="text-xs opacity-90">Requires attention</div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-slate-500 mb-2">Simulated Preview Table</div>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b">
                    <tr>
                      <th className="p-3">Row</th>
                      <th className="p-3">Item Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Quantity</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-3">1</td>
                      <td className="p-3">YMCK Ribbon</td>
                      <td className="p-3">Printer Consumables</td>
                      <td className="p-3">50</td>
                      <td className="p-3 text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Valid</td>
                    </tr>
                    <tr className="bg-orange-50/30">
                      <td className="p-3">2</td>
                      <td className="p-3">Unknown Item</td>
                      <td className="p-3">Other</td>
                      <td className="p-3">0</td>
                      <td className="p-3 text-orange-600 font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3"/> Invalid Quantity</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-end gap-3 py-4">
              <Button variant="outline" onClick={() => setShowPreview(false)}>Cancel</Button>
              <Link href="/consumables">
                <Button className="bg-dvla-gold hover:bg-dvla-gold-hover text-slate-900 font-semibold" onClick={() => alert("Import Successful! (Simulated)")}>
                  Confirm Import
                </Button>
              </Link>
            </CardFooter>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
