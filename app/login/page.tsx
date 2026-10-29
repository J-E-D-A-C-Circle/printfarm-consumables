"use client";

import { useActionState, useState } from "react";
import { login, LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Eye, EyeOff, Lock, Mail } from "lucide-react";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-sm border border-slate-200/80 mb-3 p-2 overflow-hidden">
            <img src="/oop.png" alt="DVLA Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            DVLA Consumables Return System
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Driver and Vehicle Licensing Authority — Ghana
          </p>
        </div>

        {/* Sign In Card */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-medium text-slate-800">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your DVLA staff email and password to continue
            </p>
          </div>

          <form action={formAction} className="p-6 space-y-4">
            {state.error && (
              <div className="flex items-start gap-2.5 bg-red-50/90 border border-red-200 text-red-700 rounded-lg px-3.5 py-2.5 text-xs">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-slate-600">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@dvla.gov.gh"
                  className="pl-9 h-9 text-sm bg-white border-slate-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-slate-600">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9 pr-9 h-9 text-sm bg-white border-slate-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-dvla-green hover:bg-dvla-green-light text-white font-medium h-9 text-sm mt-2"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="px-6 py-3.5 bg-slate-50/60 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Having trouble signing in? Contact your system administrator.
            </p>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-8">
          © {new Date().getFullYear()} Driver and Vehicle Licensing Authority, Ghana
        </p>
      </div>
    </div>
  );
}
