"use client";

import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { Suspense, useState } from "react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Suspense fallback={<div className="h-full w-64 bg-dvla-green"></div>}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </Suspense>
      <div className="flex flex-1 flex-col overflow-hidden w-full">
        <TopHeader onMobileToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

