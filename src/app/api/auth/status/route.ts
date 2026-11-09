import { NextResponse } from "next/server";
import { ensureTenantBranch, listAccounts } from "@/lib/data/repo";

export async function GET() {
  try {
    await ensureTenantBranch();
    const accounts = await listAccounts();
    return NextResponse.json(
      { needsSetup: !accounts.some((account) => account.role === "Owner") },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not check accounts" },
      { status: 500 },
    );
  }
}
