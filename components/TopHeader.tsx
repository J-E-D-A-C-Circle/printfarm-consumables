"use client";

import { LogOut, Menu, Shield, User } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface TopHeaderProps {
  onMobileToggle?: () => void;
}

interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

function TopHeaderContent({ onMobileToggle }: TopHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cat = searchParams.get("category");

  const [user, setUser] = useState<SessionUser | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/me", { method: "POST" });
      router.push("/logout");
      router.refresh();
    } catch {
      window.location.href = "/logout";
    }
  };

  const getTitle = () => {
    if (pathname === "/") return "Consumables Request & Production Dashboard";
    if (pathname.startsWith("/stocks")) return "Consumable Stocks & Store Balances";
    if (pathname.startsWith("/categories")) {
      return cat ? `Consumables Return Sheet — ${cat}` : "Consumables Return Sheet";
    }
    if (pathname.startsWith("/reports")) return "Return Sheet & Consumption Reports";
    if (pathname.startsWith("/settings")) return "System Settings & Access Control";
    return "DVLA Consumables Return System";
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-6 print:hidden">
      <div className="flex items-center gap-3">
        {onMobileToggle && (
          <button
            onClick={onMobileToggle}
            className="lg:hidden rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-base sm:text-lg font-semibold text-slate-800 tracking-tight truncate max-w-[240px] sm:max-w-none">
          {getTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-2.5">
        {user && (
          <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80">
            <User className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-700">{user.name}</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {user.role}
            </span>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          disabled={signingOut}
          className="h-8 text-xs font-medium border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 gap-1.5"
          title="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>{signingOut ? "Signing out..." : "Sign out"}</span>
        </Button>

        <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center ring-1 ring-slate-200 shrink-0 overflow-hidden p-1">
          <img src="/oop.png" alt="DVLA Logo" className="h-full w-full object-contain" />
        </div>
      </div>
    </header>
  );
}

export function TopHeader({ onMobileToggle }: TopHeaderProps) {
  return (
    <Suspense fallback={<header className="sticky top-0 z-30 flex h-16 w-full items-center border-b bg-white px-4" />}>
      <TopHeaderContent onMobileToggle={onMobileToggle} />
    </Suspense>
  );
}
