"use client";

import { Button } from "@/components/ui/button";
import { Bell, Search, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface TopHeaderProps {
  onMobileToggle?: () => void;
}

function TopHeaderContent({ onMobileToggle }: TopHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Simple title mapping
  const getTitle = () => {
    if (pathname === "/") return "Dashboard Overview";
    if (pathname.startsWith("/consumables/add")) return "Add Consumable Record";
    if (pathname.startsWith("/consumables")) return "Consumables Records";
    if (pathname.startsWith("/categories")) return "Categories & Dispatches";
    if (pathname.startsWith("/stock/receive")) return "Receive Stock";
    if (pathname.startsWith("/stock/issue")) return "Issue Stock";
    if (pathname.startsWith("/movements")) return "Stock Movements";
    if (pathname.startsWith("/reports")) return "Reports";
    if (pathname.startsWith("/settings")) return "System Settings";
    if (pathname.startsWith("/import")) return "Import Records";
    return "Consumables Management";
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-3">
        {onMobileToggle && (
          <button
            onClick={onMobileToggle}
            className="lg:hidden rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight truncate max-w-[200px] sm:max-w-none">
          {getTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search items, categories..."
            className="h-9 w-48 lg:w-64 rounded-md border border-slate-200 bg-slate-50 pl-9 pr-4 text-xs sm:text-sm outline-none focus:border-dvla-green focus:ring-1 focus:ring-dvla-green transition-all"
          />
        </div>

        <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center shadow-xs ring-2 ring-slate-200 cursor-pointer shrink-0 overflow-hidden p-1">
          <img src="/oop.png" alt="DVLA Logo" className="h-full w-full object-contain" />
        </div>
      </div>
    </header>
  );
}

export function TopHeader({ onMobileToggle }: TopHeaderProps) {
  return (
    <Suspense fallback={<header className="sticky top-0 z-30 flex h-16 w-full items-center border-b bg-white px-4 shadow-sm" />}>
      <TopHeaderContent onMobileToggle={onMobileToggle} />
    </Suspense>
  );
}

