import { NextResponse } from "next/server";
import { cleanUsername, requireOwner, validCredentials } from "@/lib/auth-http";
import { insertAccount, listAccounts } from "@/lib/data/repo";
import { hashPassword } from "@/lib/passwords";
import { TEAM_ROLES } from "@/lib/defaults";

const STAFF_ROLES = TEAM_ROLES.filter((role) => role !== "Owner");

export async function GET(request: Request) {
  try {
    const { error } = await requireOwner(request);
    if (error) return error;
    const accounts = await listAccounts();
    return NextResponse.json(accounts, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not list accounts" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await requireOwner(request);
    if (error) return error;
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const username = cleanUsername(body.username);
    const password = String(body.password ?? "");
    const role = String(body.role ?? "").trim();
    const invalid = validCredentials(name, username, password);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
    if (!STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number])) {
      return NextResponse.json({ error: "Choose a staff role. The main account is already set." }, { status: 400 });
    }
    const user = await insertAccount({ name, username, role, passwordHash: hashPassword(password) });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the account";
    const status = message.includes("already in use") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
