import { NextResponse } from "next/server";
import { canUseInventory, requireAccess } from "@/lib/auth-http";
import { listLedger } from "@/lib/data/repo";

export async function GET(request: Request) {
  try {
    const { error } = await requireAccess(request, canUseInventory, "Inventory is not available for this account");
    if (error) return error;
    return NextResponse.json(await listLedger());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list ledger" },
      { status: 500 },
    );
  }
}
