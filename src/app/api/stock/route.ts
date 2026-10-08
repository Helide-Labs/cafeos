import { NextResponse } from "next/server";
import { createStock, listStock } from "@/lib/data/repo";

export async function GET() {
  try {
    return NextResponse.json(await listStock());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list stock" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const category = String(body.category ?? "").trim();
    const unit = String(body.unit ?? "").trim();

    if (!name || !category || !unit) {
      return NextResponse.json({ error: "name, category and unit are required" }, { status: 400 });
    }

    const item = await createStock({
      name,
      category,
      unit,
      quantity: Number(body.quantity ?? 0),
      minimum: Number(body.minimum ?? 0),
      value: Number(body.value ?? 0),
      supplier: String(body.supplier ?? ""),
      trend: Number(body.trend ?? 0),
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create stock item" },
      { status: 500 },
    );
  }
}
