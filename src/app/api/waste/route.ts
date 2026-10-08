import { NextResponse } from "next/server";
import { listWaste, recordWaste } from "@/lib/data/repo";

export async function GET() {
  try {
    return NextResponse.json(await listWaste());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list waste records" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const stockId = String(body.stockId ?? "").trim();
    const quantity = Number(body.quantity);
    const reason = String(body.reason ?? "").trim();

    if (!stockId || !Number.isFinite(quantity) || quantity <= 0 || !reason) {
      return NextResponse.json({ error: "stockId, quantity and reason are required" }, { status: 400 });
    }

    const record = await recordWaste({ stockId, quantity, reason });
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record waste";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
