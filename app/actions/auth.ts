"use server";

import { redirect } from "next/navigation";
import { queryOne, execute } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { verifyPassword, hashPassword } from "@/lib/passwords";
import { logAudit } from "@/lib/audit";

interface DBUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  role: "Administrator" | "Supervisor" | "Store Officer" | "Station Officer" | "Viewer";
  station_id: number | null;
  station_name: string | null;
  department_id: number | null;
  status: string;
  must_change_password: number;
  failed_login_attempts: number;
  locked_until: string | null;
}

export interface LoginState {
  error?: string;
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const user = await queryOne<DBUser>(
    `SELECT u.*, s.name AS station_name
     FROM users u
     LEFT JOIN stations s ON s.id = u.station_id
     WHERE u.email = ? LIMIT 1`,
    [email]
  );

  if (!user) {
    return { error: "Invalid email or password." };
  }

  // Check if account is locked
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return { error: "Account temporarily locked due to too many failed attempts. Try again later." };
  }

  if (user.status === "Inactive") {
    return { error: "Your account has been deactivated. Contact an administrator." };
  }

  const valid = await verifyPassword(password, user.password_hash);

  if (!valid) {
    const attempts = user.failed_login_attempts + 1;
    const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await execute(
      `UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?`,
      [attempts, lockUntil ? lockUntil.toISOString().slice(0, 19).replace("T", " ") : null, user.id]
    );
    return { error: "Invalid email or password." };
  }

  // Reset failed attempts and update last login
  await execute(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?`,
    [user.id]
  );

  await createSession({
    id: user.id,
    email: user.email,
    name: `${user.first_name} ${user.last_name}`,
    role: user.role,
    stationId: user.station_id,
    stationName: user.station_name,
    departmentId: user.department_id,
    mustChangePassword: user.must_change_password === 1,
  });

  await logAudit({
    userId: user.id,
    userName: `${user.first_name} ${user.last_name}`,
    action: "LOGIN",
  });

  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const user = await queryOne<{ password_hash: string }>(
    `SELECT password_hash FROM users WHERE id = ?`,
    [userId]
  );

  if (!user) return { success: false, error: "User not found." };

  const valid = await verifyPassword(currentPassword, user.password_hash);
  if (!valid) return { success: false, error: "Current password is incorrect." };

  if (newPassword.length < 8) {
    return { success: false, error: "New password must be at least 8 characters." };
  }

  const hash = await hashPassword(newPassword);
  await execute(
    `UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?`,
    [hash, userId]
  );

  return { success: true };
}
