import { NextResponse } from "next/server";
import { cleanUsername, validCredentials } from "@/lib/auth-http";
import { ensureTenantBranch, insertAccount, listAccounts } from "@/lib/data/repo";
import { hashPassword } from "@/lib/passwords";
import { signSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    await ensureTenantBranch();
    const accounts = await listAccounts();
    if (accounts.some((account) => account.role === "Owner")) {
      return NextResponse.json({ error: "The main account already exists" }, { status: 409 });
    }
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const username = cleanUsername(body.username);
    const password = String(body.password ?? "");
    const invalid = validCredentials(name, username, password);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const user = await insertAccount({ name, username, role: "Owner", passwordHash: hashPassword(password) });
    return NextResponse.json({ user, token: signSession(user.id) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create the main account" },
      { status: 500 },
    );
  }
}
