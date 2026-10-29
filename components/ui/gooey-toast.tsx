"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

export type GooeyToastVariant = "success" | "error" | "warning" | "info";

export interface GooeyToastOptions {
  description?: string;
  duration?: number;
}

export interface GooeyToastItem {
  id: string;
  title: string;
  description?: string;
  variant: GooeyToastVariant;
  duration: number;
}

type Listener = (toasts: GooeyToastItem[]) => void;

let toastsState: GooeyToastItem[] = [];
const listeners = new Set<Listener>();

function emitChange() {
  for (const listener of listeners) {
    listener([...toastsState]);
  }
}

function addToast(
  variant: GooeyToastVariant,
  title: string,
  options?: GooeyToastOptions
) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const duration = options?.duration ?? 4500;
  const item: GooeyToastItem = {
    id,
    title,
    description: options?.description,
    variant,
    duration,
  };
  toastsState = [item, ...toastsState].slice(0, 4);
  emitChange();

  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }
  return id;
}

export function dismissToast(id: string) {
  toastsState = toastsState.filter((t) => t.id !== id);
  emitChange();
}

export const gooeyToast = {
  success: (title: string, options?: GooeyToastOptions) =>
    addToast("success", title, options),
  error: (title: string, options?: GooeyToastOptions) =>
    addToast("error", title, options),
  warning: (title: string, options?: GooeyToastOptions) =>
    addToast("warning", title, options),
  info: (title: string, options?: GooeyToastOptions) =>
    addToast("info", title, options),
  dismiss: dismissToast,
};

const VARIANT_STYLES: Record<
  GooeyToastVariant,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
    badgeText: string;
    accentBar: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    iconColor: "text-emerald-400",
    badgeText: "Success",
    accentBar: "bg-emerald-500",
  },
  error: {
    icon: AlertCircle,
    iconBg: "bg-red-500/20 text-red-400 border-red-500/30",
    iconColor: "text-red-400",
    badgeText: "Error",
    accentBar: "bg-red-500",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    iconColor: "text-amber-400",
    badgeText: "Notice",
    accentBar: "bg-amber-500",
  },
  info: {
    icon: Info,
    iconBg: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    iconColor: "text-blue-400",
    badgeText: "Update",
    accentBar: "bg-blue-500",
  },
};

function GooeyToastCard({ item }: { item: GooeyToastItem }) {
  const [expanded, setExpanded] = useState(false);
  const style = VARIANT_STYLES[item.variant];
  const Icon = style.icon;

  // Automatically morph open the description bubble right after the pill lands
  useEffect(() => {
    if (!item.description) return;
    const t = setTimeout(() => setExpanded(true), 110);
    return () => clearTimeout(t);
  }, [item.description]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -28, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.88, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      onMouseEnter={() => item.description && setExpanded(true)}
      className="relative w-[350px] sm:w-[380px] pointer-events-auto select-none"
    >
      {/* Gooey Liquid Morphing Background Layer */}
      <div
        className=" relative w-full"
        style={{ filter: "url(#gooey-toast-svg-filter)" }}
      >
        {/* Top Pill Blob */}
        <motion.div
          layout
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 shadow-xl"
        >
          <div className="h-5" />
        </motion.div>

        {/* Connected Liquid Bridge + Description Blob */}
        <AnimatePresence initial={false}>
          {item.description && expanded && (
            <motion.div
              initial={{ opacity: 0, y: -22, scaleY: 0.4, height: 0 }}
              animate={{ opacity: 1, y: -6, scaleY: 1, height: "auto" }}
              exit={{ opacity: 0, y: -18, scaleY: 0.4, height: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 24 }}
              className="w-full origin-top"
            >
              {/* Liquid neck connector */}
              <div className="mx-auto h-3 w-28 bg-slate-900 rounded-full -mt-1.5" />
              <div className="w-full rounded-2xl bg-slate-900 px-4 py-3.5 -mt-1.5 shadow-xl">
                <p className="text-xs leading-relaxed text-transparent select-none">
                  {item.description}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Crisp Foreground Content Layer */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {/* Top Pill Content */}
        <div className="flex items-center justify-between gap-2.5 px-3.5 h-[44px]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`h-6 w-6 rounded-full border flex items-center justify-center shrink-0 ${style.iconBg}`}
            >
              <Icon className={`h-3.5 w-3.5 ${style.iconColor}`} />
            </span>
            <span className="text-xs font-medium text-white truncate">
              {item.title}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
              {style.badgeText}
            </span>
            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              className="pointer-events-auto h-5 w-5 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close notification"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Description Content */}
        <AnimatePresence initial={false}>
          {item.description && expanded && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, delay: 0.04 }}
              className="px-4 pt-2 pb-3 flex items-start gap-2.5"
            >
              <span
                className={`mt-1 h-2 w-1 rounded-full shrink-0 ${style.accentBar}`}
              />
              <p className="text-xs font-normal leading-relaxed text-slate-300">
                {item.description}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function GooeyToaster() {
  const [toasts, setToasts] = useState<GooeyToastItem[]>([]);

  useEffect(() => {
    const handler: Listener = (updated) => setToasts(updated);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return (
    <>
      {/* Hidden SVG Filter for the Gooey Liquid Morph Effect */}
      <svg
        className="fixed w-0 h-0 pointer-events-none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter id="gooey-toast-svg-filter">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="7"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9"
              result="gooey"
            />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Fixed Top-Right Gooey Toast Stack */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col items-end gap-2.5 pointer-events-none print:hidden">
        <AnimatePresence mode="popLayout">
          {toasts.map((item) => (
            <GooeyToastCard key={item.id} item={item} />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

