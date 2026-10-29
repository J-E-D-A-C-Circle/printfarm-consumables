"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PackageOpen, UserPlus, Users, Search, Edit2, Trash2, UserX, UserCheck, AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { gooeyToast } from "@/components/ui/gooey-toast";

interface DbUser {
  id: number;
  employee_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  last_login_at: string | null;
}

interface CategoryItem {
  id: number;
  name: string;
  code_prefix?: string;
  purpose?: string;
  item_count?: number;
}

export default function SettingsPage() {
  const [users, setUsers] = useState<DbUser[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<number | null>(null);
  const [categoryMsg, setCategoryMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Station Officer");
  const [newUserPassword, setNewUserPassword] = useState("Admin@1234");
  const [submittingUser, setSubmittingUser] = useState(false);
  const [userMsg, setUserMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [editingUser, setEditingUser] = useState<DbUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [deleteTargetUser, setDeleteTargetUser] = useState<DbUser | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [deleteTargetCat, setDeleteTargetCat] = useState<CategoryItem | null>(null);

  const loadData = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const [usersRes, catsRes] = await Promise.all([
        fetch("/api/users", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);

      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsers(d.data || []);
      }
      if (catsRes.ok) {
        const d = await catsRes.json();
        setCategories(d.data || []);
      }
    } catch (err) {
      console.error("Failed to load settings data:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setCategoryMsg(null);

    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      const msg = `Category "${trimmed}" already exists.`;
      setCategoryMsg({ type: "error", text: msg });
      gooeyToast.warning("Type Already Exists", { description: msg });
      return;
    }

    setAddingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          code_prefix: trimmed.slice(0, 4).toUpperCase(),
          purpose: "printing",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create category.");

      setCategoryMsg({ type: "success", text: `Consumable type "${trimmed}" created.` });
      gooeyToast.success("Consumable Type Created", {
        description: `"${trimmed}" is now available in the Consumables Return Sheet and Stock Registry.`,
      });
      setNewCategoryName("");
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add category.";
      setCategoryMsg({ type: "error", text: message });
      gooeyToast.error("Failed to Add Type", { description: message });
    } finally {
      setAddingCategory(false);
    }
  };

  const handleDeleteCategory = (cat: CategoryItem) => {
    setDeleteTargetCat(cat);
  };

  const confirmDeleteCategory = async () => {
    if (!deleteTargetCat) return;
    const cat = deleteTargetCat;
    setCategoryMsg(null);
    setDeletingCatId(cat.id);

    try {
      const res = await fetch("/api/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, name: cat.name }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Cannot delete "${cat.name}".`);
      }

      setDeleteTargetCat(null);
      setCategoryMsg({ type: "success", text: `Consumable type "${cat.name}" deleted.` });
      gooeyToast.success("Consumable Type Deleted", {
        description: `"${cat.name}" has been removed from the system.`,
      });
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `Cannot delete "${cat.name}".`;
      setCategoryMsg({
        type: "error",
        text: message,
      });
      gooeyToast.error("Cannot Delete Type", { description: message });
    } finally {
      setDeletingCatId(null);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserMsg(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      const msg = "First name, last name, and email are required.";
      setUserMsg({ type: "error", text: msg });
      gooeyToast.warning("Missing Fields", { description: msg });
      return;
    }

    setSubmittingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password: newUserPassword,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user account.");

      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      setUserMsg({ type: "success", text: `User account for ${fullName} created.` });
      gooeyToast.success("User Account Created", {
        description: `Provisioned ${role} account for ${fullName} (${email.trim()}).`,
      });
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error creating user.";
      setUserMsg({ type: "error", text: message });
      gooeyToast.error("Account Creation Failed", { description: message });
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleToggleStatus = async (user: DbUser) => {
    const nextStatus = user.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        gooeyToast.info(`Account ${nextStatus}`, {
          description: `${user.first_name} ${user.last_name}'s account status is now ${nextStatus}.`,
        });
        await loadData();
      } else {
        gooeyToast.error("Status Update Failed", {
          description: "Failed to update user account status.",
        });
      }
    } catch {
      gooeyToast.error("Status Update Failed", {
        description: "Network error while updating user status.",
      });
    }
  };

  const handleDeleteUser = (user: DbUser) => {
    setDeleteTargetUser(user);
  };

  const confirmDeleteUser = async () => {
    if (!deleteTargetUser) return;
    const user = deleteTargetUser;
    setDeletingUserId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteTargetUser(null);
        gooeyToast.success("User Account Deleted", {
          description: `Removed account for ${user.first_name} ${user.last_name} (${user.email}).`,
        });
        await loadData();
      } else {
        const data = await res.json();
        gooeyToast.error("Delete Failed", {
          description: data.error || "Failed to delete user account.",
        });
      }
    } catch {
      gooeyToast.error("Delete Failed", {
        description: "Error deleting user account.",
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleOpenEdit = (user: DbUser) => {
    setEditingUser({ ...user });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
          email: editingUser.email,
          phone: editingUser.phone,
          role: editingUser.role,
          status: editingUser.status,
        }),
      });
      if (res.ok) {
        setEditOpen(false);
        gooeyToast.success("User Account Updated", {
          description: `Saved changes for ${editingUser.first_name} ${editingUser.last_name} (${editingUser.role}).`,
        });
        await loadData();
      } else {
        const d = await res.json();
        gooeyToast.error("Update Failed", {
          description: d.error || "Failed to save user updates.",
        });
      }
    } catch {
      gooeyToast.error("Update Failed", {
        description: "Error updating user account.",
      });
    }
  };

  const filteredUsers = users.filter((u) => {
    const nameStr = `${u.first_name} ${u.last_name}`.toLowerCase();
    const matchesSearch =
      nameStr.includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(u.id).includes(searchTerm);

    const matchesRole = roleFilter !== "all" ? u.role.toLowerCase() === roleFilter.toLowerCase() : true;
    const matchesStatus = statusFilter !== "all" ? u.status.toLowerCase() === statusFilter.toLowerCase() : true;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (roleName: string) => {
    switch (roleName) {
      case "Administrator":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-normal">{roleName}</Badge>;
      case "Store Officer":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal">{roleName}</Badge>;
      case "Station Officer":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-normal">{roleName}</Badge>;
      case "Supervisor":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-normal">{roleName}</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-normal">{roleName}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Settings & Access Control</h1>
            <p className="text-sm text-slate-500 mt-1">Manage staff accounts, role permissions, and consumable types.</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="gap-2 h-9 text-xs text-slate-600 font-normal border-slate-200">
            <RefreshCw className={`h-3.5 w-3.5 ${loadingUsers ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* SECTION 1: USER ACCOUNTS TABLE */}
        <Card className="shadow-none border-slate-200/80 py-0 overflow-hidden">
          <CardHeader className="p-6 border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-medium flex items-center gap-2 text-slate-900">
                  <Users className="h-4 w-4 text-dvla-green" />
                  User Accounts ({users.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Staff accounts with assigned system roles and active status.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search accounts..."
                    className="pl-9 bg-slate-50/70 border-slate-200 text-xs h-9 font-normal"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[145px] bg-slate-50/70 border-slate-200 text-xs h-9 font-normal">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="administrator">Administrator</SelectItem>
                    <SelectItem value="store officer">Store Officer</SelectItem>
                    <SelectItem value="station officer">Station Officer</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[125px] bg-slate-50/70 border-slate-200 text-xs h-9 font-normal">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 border-b border-slate-100">
                  <TableHead className="w-[80px] font-medium text-slate-600 py-3 px-4">ID</TableHead>
                  <TableHead className="font-medium text-slate-600 py-3 px-4">User Details</TableHead>
                  <TableHead className="font-medium text-slate-600 py-3 px-4">Phone</TableHead>
                  <TableHead className="font-medium text-slate-600 py-3 px-4">Role</TableHead>
                  <TableHead className="text-center font-medium text-slate-600 py-3 px-4">Status</TableHead>
                  <TableHead className="font-medium text-slate-600 py-3 px-4">Last Login</TableHead>
                  <TableHead className="text-right font-medium text-slate-600 py-3 px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingUsers ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-dvla-green mb-1" />
                      Loading user accounts...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                      No user accounts match your search filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-slate-50/70 border-b border-slate-100">
                      <TableCell className="py-3 px-4 text-xs text-slate-400">#{user.id}</TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="font-medium text-slate-800 text-sm">{user.first_name} {user.last_name}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-xs text-slate-600">
                        {user.phone || "—"}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center">
                        <Badge
                          variant="outline"
                          className={user.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-normal" : "bg-slate-100 text-slate-600 border-slate-200 font-normal"}
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-xs text-slate-500">
                        {user.last_login_at ? user.last_login_at.slice(0, 10) : "Never"}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-dvla-green"
                            title="Edit Account"
                            onClick={() => handleOpenEdit(user)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${user.status === 'Active' ? 'text-slate-400 hover:text-amber-600' : 'text-slate-400 hover:text-emerald-600'}`}
                            title={user.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                            onClick={() => handleToggleStatus(user)}
                          >
                            {user.status === 'Active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                            title="Delete Account"
                            onClick={() => handleDeleteUser(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="p-4 bg-slate-50/40 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing <span className="font-medium text-slate-700">{filteredUsers.length}</span> of <span className="font-medium text-slate-700">{users.length}</span> accounts
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> {users.filter(a => a.status === "Active").length} Active</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-300"></span> {users.filter(a => a.status === "Inactive").length} Inactive</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: CREATE ACCOUNT & CONSUMABLE TYPES MANAGEMENT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* User Account Provisioning Form */}
          <Card className="shadow-none border-slate-200/80 py-0">
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-medium flex items-center gap-2 text-slate-900">
                <UserPlus className="h-4 w-4 text-dvla-green" />
                Create New User Account
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Provision a new staff account with an assigned access role.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleAddUser}>
              <CardContent className="p-6 space-y-4">
                {userMsg && (
                  <div
                    className={`flex items-start gap-2 px-3.5 py-2.5 rounded-lg text-xs ${
                      userMsg.type === "success"
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                        : "bg-red-50 border border-red-200 text-red-700"
                    }`}
                  >
                    {userMsg.type === "success" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                    )}
                    <span>{userMsg.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs font-normal text-slate-500">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={submittingUser}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs font-normal text-slate-500">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={submittingUser}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-normal text-slate-500">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john.doe@dvla.gov.gh"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={submittingUser}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-normal text-slate-500">Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder="030-0000000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={submittingUser}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="role" className="text-xs font-normal text-slate-500">System Role</Label>
                    <Select value={role} onValueChange={setRole} disabled={submittingUser}>
                      <SelectTrigger id="role" className="bg-white font-normal">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Administrator">Administrator</SelectItem>
                        <SelectItem value="Store Officer">Store Officer</SelectItem>
                        <SelectItem value="Station Officer">Station Officer</SelectItem>
                        <SelectItem value="Supervisor">Supervisor</SelectItem>
                        <SelectItem value="Viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pass" className="text-xs font-normal text-slate-500">Default Password</Label>
                    <Input
                      id="pass"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      disabled={submittingUser}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="px-6 py-4 bg-slate-50/40 border-t border-slate-100 flex justify-end">
                <Button type="submit" disabled={submittingUser} className="bg-dvla-green hover:bg-dvla-green-light text-white font-medium h-9 text-xs">
                  {submittingUser ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : "Create Account"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Consumable Types Management Card */}
          <Card className="shadow-none border-slate-200/80 py-0">
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-medium flex items-center gap-2 text-slate-900">
                <PackageOpen className="h-4 w-4 text-dvla-green" />
                Consumable Types
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Manage the consumable types available in the Consumables Return Sheet.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {categoryMsg && (
                <div
                  className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg text-xs ${
                    categoryMsg.type === "success"
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                      : "bg-red-50 border border-red-200 text-red-700"
                  }`}
                >
                  {categoryMsg.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{categoryMsg.text}</span>
                </div>
              )}

              <div className="flex items-end gap-2.5">
                <div className="space-y-1.5 flex-1">
                  <Label htmlFor="newCategory" className="text-xs font-normal text-slate-500">
                    New Consumable Type Name
                  </Label>
                  <Input
                    id="newCategory"
                    placeholder="e.g. Laminate Film"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                    disabled={addingCategory}
                  />
                </div>
                <Button
                  onClick={handleAddCategory}
                  disabled={addingCategory || !newCategoryName.trim()}
                  className="bg-dvla-green hover:bg-dvla-green-light text-white shrink-0 font-medium h-9 text-xs"
                >
                  {addingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Type"}
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-normal text-slate-500">
                  Active Consumable Types ({categories.length})
                </Label>
                <div className="border border-slate-200/80 rounded-lg divide-y divide-slate-100 bg-white">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50/70 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-medium text-slate-800">{cat.name}</span>
                        <span className="text-xs text-slate-400">
                          ({cat.item_count || 0} requests)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title={`Delete consumable type "${cat.name}"`}
                        disabled={deletingCatId === cat.id}
                        onClick={() => handleDeleteCategory(cat)}
                      >
                        {deletingCatId === cat.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-400">No consumable types found.</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MODAL: EDIT USER ACCOUNT */}
        {editingUser && (
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                  <Edit2 className="h-4 w-4 text-dvla-green" />
                  Edit User Account #{editingUser.id}
                </DialogTitle>
                <DialogDescription>
                  Update user details, phone, system role, and account status.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-fname" className="text-xs font-normal text-slate-500">First Name</Label>
                    <Input
                      id="edit-fname"
                      value={editingUser.first_name}
                      onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-lname" className="text-xs font-normal text-slate-500">Last Name</Label>
                    <Input
                      id="edit-lname"
                      value={editingUser.last_name}
                      onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-email" className="text-xs font-normal text-slate-500">Email Address</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-phone" className="text-xs font-normal text-slate-500">Phone Number</Label>
                    <Input
                      id="edit-phone"
                      value={editingUser.phone || ""}
                      onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-role" className="text-xs font-normal text-slate-500">System Role</Label>
                    <Select
                      value={editingUser.role}
                      onValueChange={(val) => setEditingUser({ ...editingUser, role: val })}
                    >
                      <SelectTrigger id="edit-role" className="bg-white font-normal">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Administrator">Administrator</SelectItem>
                        <SelectItem value="Store Officer">Store Officer</SelectItem>
                        <SelectItem value="Station Officer">Station Officer</SelectItem>
                        <SelectItem value="Supervisor">Supervisor</SelectItem>
                        <SelectItem value="Viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-status" className="text-xs font-normal text-slate-500">Account Status</Label>
                    <Select
                      value={editingUser.status}
                      onValueChange={(val) => setEditingUser({ ...editingUser, status: val })}
                    >
                      <SelectTrigger id="edit-status" className="bg-white font-normal">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)} className="font-normal">Cancel</Button>
                <Button className="bg-dvla-green hover:bg-dvla-green-light text-white font-medium" onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* MODAL: DELETE USER ACCOUNT CONFIRMATION */}
        <Dialog
          open={!!deleteTargetUser}
          onOpenChange={(open) => {
            if (!open && !deletingUserId) setDeleteTargetUser(null);
          }}
        >
          <DialogContent className="sm:max-w-md border-slate-200 p-6">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold text-slate-900">
                    Delete User Account
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Are you sure you want to permanently remove this user account?
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {deleteTargetUser && (
              <div className="my-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Full Name</span>
                  <span className="font-medium text-slate-900">
                    {deleteTargetUser.first_name} {deleteTargetUser.last_name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Email Address</span>
                  <span className="font-medium text-slate-700">
                    {deleteTargetUser.email}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Assigned Role</span>
                  <span className="font-medium text-slate-800">
                    {deleteTargetUser.role}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!!deletingUserId}
                onClick={() => setDeleteTargetUser(null)}
                className="h-9 text-xs font-normal border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!!deletingUserId}
                onClick={confirmDeleteUser}
                className="h-9 text-xs font-medium bg-red-600 hover:bg-red-700 text-white gap-1.5"
              >
                {deletingUserId ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" /> Delete Account
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: DELETE CONSUMABLE TYPE CONFIRMATION */}
        <Dialog
          open={!!deleteTargetCat}
          onOpenChange={(open) => {
            if (!open && !deletingCatId) setDeleteTargetCat(null);
          }}
        >
          <DialogContent className="sm:max-w-md border-slate-200 p-6">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold text-slate-900">
                    Delete Consumable Type
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Are you sure you want to delete consumable type &ldquo;{deleteTargetCat?.name}&rdquo;?
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                disabled={!!deletingCatId}
                onClick={() => setDeleteTargetCat(null)}
                className="h-9 text-xs font-normal border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!!deletingCatId}
                onClick={confirmDeleteCategory}
                className="h-9 text-xs font-medium bg-red-600 hover:bg-red-700 text-white gap-1.5"
              >
                {deletingCatId ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" /> Delete Type
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
