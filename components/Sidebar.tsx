"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileSpreadsheet,
  FileText,
  Settings,
  PackageOpen,
  Boxes,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Consumable Stocks", href: "/stocks", icon: Boxes },
  { name: "Consumables Return Sheet", href: "/categories", icon: FileSpreadsheet },
  { name: "Reports & Analytics", href: "/reports", icon: FileText },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category");

  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [categoriesExpanded, setCategoriesExpanded] = useState<boolean>(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadSidebarData() {
      try {
        const [catRes, meRes] = await Promise.all([
          fetch("/api/categories", { cache: "no-store" }),
          fetch("/api/auth/me", { cache: "no-store" }),
        ]);
        if (active && catRes.ok) {
          const d = await catRes.json();
          const names = (d.data || []).map((c: { name: string }) => c.name);
          setCategoriesList(names);
        }
        if (active && meRes.ok) {
          const me = await meRes.json();
          setUserName(me?.user?.name || null);
          setUserRole(me?.user?.role || null);
        }
      } catch (err) {
        console.error("Failed to load sidebar data:", err);
      }
    }
    loadSidebarData();
    return () => {
      active = false;
    };
  }, [pathname]);

  const handleSignOut = async () => {
    if (onClose) onClose();
    try {
      await fetch("/api/auth/me", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/logout");
    router.refresh();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col bg-dvla-green text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 shrink-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo Area */}
        <div className="flex h-16 items-center justify-between px-6 font-semibold text-xl border-b border-white/10 bg-dvla-green-light shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-md bg-white p-1 flex items-center justify-center shadow-xs shrink-0 border border-white/20">
              <img src="/oop.png" alt="DVLA Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="text-sm leading-tight text-white tracking-wide">DVLA CONSUMABLES</div>
              <div className="text-[10px] text-dvla-gold leading-tight">RETURN & CONSUMPTION</div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6 flex flex-col">
          {/* Main Nav */}
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => onClose && onClose()}
                  className={cn(
                    isActive
                      ? "bg-dvla-green-light text-white font-medium shadow-xs ring-1 ring-dvla-gold/40"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                    "group flex items-center px-3 py-2.5 text-sm font-normal rounded-md transition-all"
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive ? "text-dvla-gold" : "text-white/60 group-hover:text-white",
                      "mr-3 h-5 w-5 shrink-0 transition-colors"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Collapsible Consumable Types Nav */}
          <div className="flex-1 mt-4 flex flex-col overflow-hidden">
            <button
              onClick={() => setCategoriesExpanded(!categoriesExpanded)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-dvla-gold uppercase tracking-wider hover:bg-white/5 rounded transition-colors group mb-1 shrink-0"
              title={categoriesExpanded ? "Collapse consumable types" : "Expand consumable types"}
            >
              <span>Consumable Types</span>
              <div className="p-0.5 rounded text-dvla-gold/80 group-hover:text-dvla-gold">
                {categoriesExpanded ? (
                  <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                ) : (
                  <ChevronRight className="h-4 w-4 transition-transform duration-200" />
                )}
              </div>
            </button>

            {categoriesExpanded && (
              <div className="space-y-1 flex-1 overflow-y-auto pr-2 custom-scrollbar pb-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <Link
                  href="/categories"
                  onClick={() => onClose && onClose()}
                  className={cn(
                    pathname === "/categories" && !currentCategory
                      ? "bg-white/20 text-white font-medium ring-1 ring-dvla-gold/30"
                      : "text-white/70 hover:bg-white/10 hover:text-white",
                    "group flex items-center px-3 py-1.5 text-sm font-normal rounded-md transition-all"
                  )}
                >
                  <PackageOpen
                    className={cn(
                      pathname === "/categories" && !currentCategory
                        ? "text-dvla-gold"
                        : "text-white/40 group-hover:text-white",
                      "mr-3 h-4 w-4 shrink-0 transition-colors"
                    )}
                  />
                  All Consumable Types
                </Link>

                {categoriesList.map((category) => {
                  const isCategoryActive = currentCategory === category;
                  return (
                    <Link
                      key={category}
                      href={`/categories?category=${encodeURIComponent(category)}`}
                      onClick={() => onClose && onClose()}
                      className={cn(
                        isCategoryActive
                          ? "bg-white/20 text-white font-medium ring-1 ring-dvla-gold/30"
                          : "text-white/70 hover:bg-white/10 hover:text-white",
                        "group flex items-center px-3 py-1.5 text-sm font-normal rounded-md transition-all"
                      )}
                    >
                      <PackageOpen
                        className={cn(
                          isCategoryActive
                            ? "text-dvla-gold"
                            : "text-white/40 group-hover:text-white",
                          "mr-3 h-4 w-4 shrink-0 transition-colors"
                        )}
                      />
                      {category}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Nav: Settings, User Info & Sign Out */}
          <div className="mt-auto space-y-1.5 pt-4 border-t border-white/10 shrink-0">
            {userRole === "Administrator" && (
              <Link
                href="/settings"
                onClick={() => onClose && onClose()}
                className={cn(
                  pathname.startsWith("/settings")
                    ? "bg-dvla-green-light text-white font-medium shadow-xs ring-1 ring-dvla-gold/40"
                    : "text-white/80 hover:bg-white/10 hover:text-white",
                  "group flex items-center px-3 py-2 text-sm font-normal rounded-md transition-all"
                )}
              >
                <Settings className="mr-3 h-4 w-4 shrink-0 text-white/60 group-hover:text-white" />
                Settings & Access Control
              </Link>
            )}

            {userName && (
              <div className="px-3 py-2 rounded-md bg-white/5 border border-white/10 flex items-center gap-2.5">
                <User className="h-4 w-4 text-dvla-gold shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-white truncate">{userName}</div>
                  <div className="text-[10px] text-white/60 truncate">{userRole}</div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center px-3 py-2 text-sm font-normal rounded-md text-red-200 hover:bg-red-500/20 hover:text-white transition-all group"
            >
              <LogOut className="mr-3 h-4 w-4 shrink-0 text-red-300 group-hover:text-white" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
