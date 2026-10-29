"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, LogIn, Loader2, ShieldCheck } from "lucide-react";

export default function LogoutPage() {
  const [clearing, setClearing] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { method: "POST", cache: "no-store" })
      .catch(() => {})
      .finally(() => {
        if (active) setClearing(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-xs border border-slate-200/80 mb-3 p-2 overflow-hidden">
            <img src="/oop.png" alt="DVLA Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            DVLA Consumables Return System
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Driver and Vehicle Licensing Authority — Ghana
          </p>
        </div>

        {/* Sign Out Card */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden text-center p-8 space-y-5">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600">
            {clearing ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <CheckCircle2 className="h-6 w-6" />
            )}
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-slate-900">
              {clearing ? "Signing you out..." : "You have been signed out"}
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your session has been securely ended. You can close this window or sign back in with your DVLA staff account.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/login" className="block w-full">
              <Button className="w-full bg-dvla-green hover:bg-dvla-green-light text-white font-medium h-9 text-sm gap-2">
                <LogIn className="h-4 w-4" />
                Sign in again
              </Button>
            </Link>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Session cookie cleared · Role-based access protected</span>
          </div>
        </div>
      </div>
    </div>
  );
}

