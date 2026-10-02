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

interface DbUser {
  id: number;
  employee_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  station: string | null;
  department: string | null;
  station_id?: number | null;
  department_id?: number | null;
  last_login_at: string | null;
}

interface CategoryItem {
  id: number;
  name: string;
  code_prefix?: string;
  purpose?: string;
}

interface Station {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
}

export default function SettingsPage() {
  // Database State
  const [users, setUsers] = useState<DbUser[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Category State
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<number | null>(null);
  const [categoryMsg, setCategoryMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Create User Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Station Officer");
  const [selectedStationId, setSelectedStationId] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("DVLA@2026!");
  const [submittingUser, setSubmittingUser] = useState(false);
  const [userMsg, setUserMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<DbUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Load all live database data
  const loadData = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const [usersRes, catsRes, statsRes, deptsRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/categories"),
        fetch("/api/stations"),
        fetch("/api/departments"),
      ]);

      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsers(d.data || []);
      }
      if (catsRes.ok) {
        const d = await catsRes.json();
        setCategories(d.data || []);
      }
      if (statsRes.ok) {
        const d = await statsRes.json();
        const sList: Station[] = d.data || [];
        setStations(sList);
        if (sList.length > 0 && !selectedStationId) {
          setSelectedStationId(String(sList[0].id));
        }
      }
      if (deptsRes.ok) {
        const d = await deptsRes.json();
        const dList: Department[] = d.data || [];
        setDepartments(dList);
        if (dList.length > 0 && !selectedDeptId) {
          setSelectedDeptId(String(dList[0].id));
        }
      }
    } catch (err) {
      console.error("Failed to load settings data:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, [selectedStationId, selectedDeptId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Add Category
  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setCategoryMsg(null);

    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setCategoryMsg({ type: "error", text: `Category "${trimmed}" already exists.` });
      return;
    }

    setAddingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          code_prefix: trimmed.slice(0, 3).toUpperCase(),
          purpose: "standard",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create category.");

      setCategoryMsg({ type: "success", text: `Category "${trimmed}" created successfully!` });
      setNewCategoryName("");
      await loadData();
    } catch (err: unknown) {
      setCategoryMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to add category." });
    } finally {
      setAddingCategory(false);
    }
  };

  // Handle Delete Category
  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;
    setCategoryMsg(null);
    setDeletingCatId(cat.id);

    try {
      const res = await fetch("/api/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, name: cat.name }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Cannot delete "${cat.name}".`);

      setCategoryMsg({ type: "success", text: `Category "${cat.name}" deleted successfully.` });
      await loadData();
    } catch (err: unknown) {
      setCategoryMsg({
        type: "error",
        text: err instanceof Error ? err.message : `Cannot delete category "${cat.name}".`,
      });
    } finally {
      setDeletingCatId(null);
    }
  };

  // Handle Create User Account
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserMsg(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setUserMsg({ type: "error", text: "First name, last name, and email are required." });
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
          station_id: selectedStationId ? Number(selectedStationId) : null,
          department_id: selectedDeptId ? Number(selectedDeptId) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user account.");

      setUserMsg({ type: "success", text: `User account for ${firstName} ${lastName} created successfully!` });
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      await loadData();
    } catch (err: unknown) {
      setUserMsg({ type: "error", text: err instanceof Error ? err.message : "Error creating user." });
    } finally {
      setSubmittingUser(false);
    }
  };

  // Toggle Status (Active / Inactive)
  const handleToggleStatus = async (user: DbUser) => {
    const nextStatus = user.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        await loadData();
      } else {
        alert("Failed to update user status.");
      }
    } catch {
      alert("Error updating status.");
    }
  };

  // Delete User
  const handleDeleteUser = async (user: DbUser) => {
    if (!confirm(`Are you sure you want to delete account for "${user.first_name} ${user.last_name}"?`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (res.ok) {
        await loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete user.");
      }
    } catch {
      alert("Error deleting user.");
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
          role: editingUser.role,
          status: editingUser.status,
          station_id: editingUser.station_id || null,
          department_id: editingUser.department_id || null,
        }),
      });
      if (res.ok) {
        setEditOpen(false);
        await loadData();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to save user updates.");
      }
    } catch {
      alert("Error updating user.");
    }
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const nameStr = `${u.first_name} ${u.last_name}`.toLowerCase();
    const matchesSearch =
      nameStr.includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.station && u.station.toLowerCase().includes(searchTerm.toLowerCase())) ||
      String(u.id).includes(searchTerm);

    const matchesRole = roleFilter !== "all" ? u.role.toLowerCase() === roleFilter.toLowerCase() : true;
    const matchesStatus = statusFilter !== "all" ? u.status.toLowerCase() === statusFilter.toLowerCase() : true;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (roleName: string) => {
    switch (roleName) {
      case "Administrator":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold">{roleName}</Badge>;
      case "Store Officer":
        return <Badge className="bg-green-100 text-green-800 border-green-300 font-semibold">{roleName}</Badge>;
      case "Station Officer":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-semibold">{roleName}</Badge>;
      case "Supervisor":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-semibold">{roleName}</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-100 text-slate-700">{roleName}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings</h2>
            <p className="text-sm text-slate-500">Live database administration for user accounts, categories, and system permissions.</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5 text-xs text-slate-600">
            <RefreshCw className={`h-3.5 w-3.5 ${loadingUsers ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>

        {/* SECTION 1: USER ACCOUNTS TABLE */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                  <Users className="h-5 w-5 text-dvla-green" />
                  User Accounts Management ({users.length})
                </CardTitle>
                <CardDescription className="mt-1">
                  Database user accounts with roles, station assignments, and active status.
                </CardDescription>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search accounts..."
                    className="pl-9 bg-white text-xs h-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[130px] bg-white text-xs h-9">
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
                  <SelectTrigger className="w-[110px] bg-white text-xs h-9">
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
                <TableRow className="bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="w-[80px]">User ID</TableHead>
                  <TableHead>User Details</TableHead>
                  <TableHead>System Role</TableHead>
                  <TableHead>Station / Dept</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingUsers ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-dvla-green mb-1" />
                      Loading user accounts...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No user accounts match your search filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-slate-50/60 border-b border-slate-100">
                      <TableCell className="font-mono text-xs text-slate-500 font-medium">#{user.id}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900 text-sm">{user.first_name} {user.last_name}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-semibold text-slate-800">{user.station || "Head Office"}</div>
                        <div className="text-[11px] text-slate-500">{user.department || "General Store"}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline" 
                          className={user.status === "Active" ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-600 border-slate-300"}
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {user.last_login_at ? user.last_login_at.slice(0, 10) : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-500 hover:text-dvla-gold"
                            title="Edit Account"
                            onClick={() => handleOpenEdit(user)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={`h-8 w-8 ${user.status === 'Active' ? 'text-slate-400 hover:text-orange-600' : 'text-slate-400 hover:text-green-600'}`}
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

            <div className="p-3.5 bg-slate-50/50 border-t flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing <span className="font-semibold text-slate-900">{filteredUsers.length}</span> of <span className="font-semibold text-slate-900">{users.length}</span> total system accounts
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500"></span> {users.filter(a => a.status === "Active").length} Active</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400"></span> {users.filter(a => a.status === "Inactive").length} Inactive</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: CREATE ACCOUNT & CATEGORY MANAGEMENT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* User Account Provisioning Form */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-dvla-gold" />
                Create New User Account
              </CardTitle>
              <CardDescription>
                Provision a new staff account into the database with assigned roles and station.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleAddUser}>
              <CardContent className="pt-6 space-y-4">
                {userMsg && (
                  <div
                    className={`flex items-start gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium ${
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
                    <Label htmlFor="firstName" className="text-xs font-semibold text-slate-700">First Name <span className="text-red-500">*</span></Label>
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
                    <Label htmlFor="lastName" className="text-xs font-semibold text-slate-700">Last Name <span className="text-red-500">*</span></Label>
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

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Email Address <span className="text-red-500">*</span></Label>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="role" className="text-xs font-semibold text-slate-700">System Role <span className="text-red-500">*</span></Label>
                    <Select value={role} onValueChange={setRole} disabled={submittingUser}>
                      <SelectTrigger id="role" className="bg-white">
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
                    <Label htmlFor="station" className="text-xs font-semibold text-slate-700">Assigned Station <span className="text-red-500">*</span></Label>
                    <Select value={selectedStationId} onValueChange={setSelectedStationId} disabled={submittingUser}>
                      <SelectTrigger id="station" className="bg-white">
                        <SelectValue placeholder="Select station" />
                      </SelectTrigger>
                      <SelectContent>
                        {stations.map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="dept" className="text-xs font-semibold text-slate-700">Department <span className="text-red-500">*</span></Label>
                    <Select value={selectedDeptId} onValueChange={setSelectedDeptId} disabled={submittingUser}>
                      <SelectTrigger id="dept" className="bg-white">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(d => (
                          <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="pass" className="text-xs font-semibold text-slate-700">Default Password</Label>
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
              <CardFooter className="bg-slate-50/80 border-t border-slate-100 flex justify-end py-4">
                <Button type="submit" disabled={submittingUser} className="bg-slate-900 hover:bg-slate-800 text-white font-semibold">
                  {submittingUser ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : "Create Account"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Category Management Card */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <PackageOpen className="h-5 w-5 text-dvla-green" />
                Category Management
              </CardTitle>
              <CardDescription>
                Live database categories. Categories without active items can be deleted cleanly.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              {categoryMsg && (
                <div
                  className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-medium ${
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

              {/* Add New Category */}
              <div className="flex items-end gap-2">
                <div className="space-y-1.5 flex-1">
                  <Label htmlFor="newCategory" className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    New Category Name
                  </Label>
                  <Input 
                    id="newCategory" 
                    placeholder="e.g. Office Supplies" 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                    disabled={addingCategory}
                  />
                </div>
                <Button 
                  onClick={handleAddCategory} 
                  disabled={addingCategory || !newCategoryName.trim()}
                  className="bg-dvla-green hover:bg-dvla-green-light text-white shrink-0 font-semibold"
                >
                  {addingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Category"}
                </Button>
              </div>

              {/* Category List without nested scrollbar / overflow height */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Active Database Categories ({categories.length})
                </Label>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{cat.name}</span>
                        {cat.code_prefix && (
                          <Badge variant="outline" className="bg-slate-50 font-mono text-[10px] text-slate-500">
                            {cat.code_prefix}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title={`Delete category "${cat.name}"`}
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
                    <div className="p-6 text-center text-xs text-slate-500">No categories found in system.</div>
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
                <DialogTitle className="flex items-center gap-2">
                  <Edit2 className="h-5 w-5 text-dvla-gold" />
                  Edit User Account: #{editingUser.id}
                </DialogTitle>
                <DialogDescription>
                  Modify user roles, station assignment, and account status.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-fname">First Name</Label>
                    <Input 
                      id="edit-fname" 
                      value={editingUser.first_name}
                      onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-lname">Last Name</Label>
                    <Input 
                      id="edit-lname" 
                      value={editingUser.last_name}
                      onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-email">Email Address</Label>
                  <Input 
                    id="edit-email" 
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-role">System Role</Label>
                    <Select 
                      value={editingUser.role} 
                      onValueChange={(val) => setEditingUser({ ...editingUser, role: val })}
                    >
                      <SelectTrigger id="edit-role" className="bg-white">
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
                    <Label htmlFor="edit-status">Account Status</Label>
                    <Select 
                      value={editingUser.status} 
                      onValueChange={(val) => setEditingUser({ ...editingUser, status: val })}
                    >
                      <SelectTrigger id="edit-status" className="bg-white">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-station">Assigned Station</Label>
                    <Select 
                      value={editingUser.station_id ? String(editingUser.station_id) : ""} 
                      onValueChange={(val) => setEditingUser({ ...editingUser, station_id: Number(val) })}
                    >
                      <SelectTrigger id="edit-station" className="bg-white">
                        <SelectValue placeholder="Select station" />
                      </SelectTrigger>
                      <SelectContent>
                        {stations.map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-department">Department</Label>
                    <Select 
                      value={editingUser.department_id ? String(editingUser.department_id) : ""} 
                      onValueChange={(val) => setEditingUser({ ...editingUser, department_id: Number(val) })}
                    >
                      <SelectTrigger id="edit-department" className="bg-white">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(d => (
                          <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button className="bg-dvla-gold hover:bg-dvla-gold-hover text-slate-900 font-semibold" onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
