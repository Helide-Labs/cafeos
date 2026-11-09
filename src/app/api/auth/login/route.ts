import { NextResponse } from "next/server";
import { cleanUsername } from "@/lib/auth-http";
import { ensureTenantBranch, findAccountByUsername } from "@/lib/data/repo";
import { verifyPassword } from "@/lib/passwords";
import { signSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    await ensureTenantBranch();
    const body = await request.json();
    const username = cleanUsername(body.username);
    const password = String(body.password ?? "");
    const account = username ? await findAccountByUsername(username) : null;
    if (!account || !verifyPassword(password, account.passwordHash)) {
      return NextResponse.json({ error: "Username or password is incorrect" }, { status: 401 });
    }
    const user = { id: account.id, name: account.name, username: account.username, role: account.role };
    return NextResponse.json({ user, token: signSession(user.id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sign in" },
      { status: 500 },
    );
  }
}
