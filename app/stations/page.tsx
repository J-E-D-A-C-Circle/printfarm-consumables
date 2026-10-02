"use client";

import { DashboardLayout } from "@/components/DashboardLayout";

export default function StationsPage() {
  return (
    <DashboardLayout>
      <div className="p-8 text-center text-slate-500">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Station Management</h2>
        <p>This page will allow administrators to manage DVLA stations and assign permissions.</p>
      </div>
    </DashboardLayout>
  );
}
