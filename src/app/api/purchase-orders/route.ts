import { NextResponse } from "next/server";
import { createPurchaseOrder, listPurchaseOrders } from "@/lib/data/repo";
import type { PurchaseOrder } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await listPurchaseOrders());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list purchase orders" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supplier = String(body.supplier ?? "").trim();
    const lines = Array.isArray(body.lines) ? body.lines : null;

    if (!supplier || !lines || lines.length === 0) {
      return NextResponse.json({ error: "supplier and lines are required" }, { status: 400 });
    }

    const order = await createPurchaseOrder({
      supplier,
      lines,
      status: body.status as PurchaseOrder["status"] | undefined,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create purchase order" },
      { status: 500 },
    );
  }
}
