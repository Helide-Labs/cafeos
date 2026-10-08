import { NextResponse } from "next/server";
import { listLedger } from "@/lib/data/repo";

export async function GET() {
  try {
    return NextResponse.json(await listLedger());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list ledger" },
      { status: 500 },
    );
  }
}
