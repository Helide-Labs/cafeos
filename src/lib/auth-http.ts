import { NextResponse } from "next/server";
import { ensureTenantBranch, getAccount } from "@/lib/data/repo";
import { accountIdFromSession, sessionToken } from "@/lib/session";
import type { StaffAccount } from "@/lib/types";

export async function currentAccount(request: Request): Promise<StaffAccount | null> {
  await ensureTenantBranch();
  const accountId = accountIdFromSession(sessionToken(request));
  if (!accountId) return null;
  const account = await getAccount(accountId);
  if (!account) return null;
  return { id: account.id, name: account.name, username: account.username, role: account.role };
}

export async function requireOwner(request: Request) {
  const account = await currentAccount(request);
  if (!account) return { account: null, error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  if (account.role !== "Owner") return { account: null, error: NextResponse.json({ error: "Only the main account can do that" }, { status: 403 }) };
  return { account, error: null };
}

export function cleanUsername(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function validCredentials(name: string, username: string, password: string) {
  if (name.trim().length < 2) return "Name is required";
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) return "Username must be 3–32 letters or numbers";
  if (password.length < 6) return "Password must be at least 6 characters";
  return "";
}
