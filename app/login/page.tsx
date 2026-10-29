"use client";

import { useActionState, useState } from "react";
import { login, LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Eye, EyeOff, Lock, Mail, ShieldCheck, KeyRound } from "lucide-react";

const initialState: LoginState = {};

const ROLE_ACCOUNTS = [
  {
    role: "Administrator",
    name: "System Administrator",
    email: "admin@dvla.gov.gh",
    access: "Full access: requests, issuing, consumption, users & types",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    role: "Store Officer (Issuer)",
    name: "Mr. Richard Anafo",
    email: "issuer@dvla.gov.gh",
    access: "Issue consumables (exact, more, or less), record consumption & edit rows",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    role: "Station Officer (Requester)",
    name: "George Adjei",
    email: "requester@dvla.gov.gh",
    access: "Create consumable requests & record total consumption outcomes",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    role: "Supervisor",
    name: "Thomas Owusu Manu",
    email: "supervisor@dvla.gov.gh",
    access: "Approve, issue, edit, reconcile & manage return sheet records",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    role: "Viewer",
    name: "Gideon Odoom",
    email: "viewer@dvla.gov.gh",
    access: "Read-only access to dashboards, return sheet & analytics reports",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
];

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSelectRole = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword("Admin@1234");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white shadow-sm border border-slate-200/80 mb-3 p-2 overflow-hidden">
            <img src="/oop.png" alt="DVLA Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            DVLA Consumables Return System
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Driver and Vehicle Licensing Authority — Request, Issue & Total Consumption Portal
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sign In Card */}
          <div className="lg:col-span-6 bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                Protected by role-based access control · Contact Administrator for account support
              </p>
            </div>
          </div>

          {/* Quick Role Access Panel */}
          <div className="lg:col-span-6 bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-medium text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Role-based access accounts
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any staff role below to auto-fill credentials (Password: <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded">Admin@1234</code>)
                </p>
              </div>
              <KeyRound className="h-4 w-4 text-slate-400 shrink-0" />
            </div>

            <div className="p-4 space-y-2.5">
              {ROLE_ACCOUNTS.map((acct) => {
                const isSelected = email === acct.email;
                return (
                  <button
                    key={acct.email}
                    type="button"
                    onClick={() => handleSelectRole(acct.email)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500/30"
                        : "border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-800">{acct.name}</span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${acct.badgeClass}`}
                      >
                        {acct.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{acct.email}</div>
                    <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {acct.access}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-8">
          © {new Date().getFullYear()} Driver and Vehicle Licensing Authority, Ghana
        </p>
      </div>
    </div>
  );
}
