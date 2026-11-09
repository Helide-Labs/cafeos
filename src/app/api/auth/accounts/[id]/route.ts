import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth-http";
import { deleteAccount, getAccount } from "@/lib/data/repo";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { account, error } = await requireOwner(request);
    if (error) return error;
    const { id } = await params;
    if (id === account.id) {
      return NextResponse.json({ error: "The main account cannot be removed" }, { status: 400 });
    }
    const target = await getAccount(id);
    if (!target) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    if (target.role === "Owner") {
      return NextResponse.json({ error: "The main account cannot be removed" }, { status: 400 });
    }
    await deleteAccount(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove the account";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
