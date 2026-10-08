import { NextResponse } from "next/server";
import { patchPurchaseOrder } from "@/lib/data/repo";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const order = await patchPurchaseOrder(id, body);
    return NextResponse.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update purchase order";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
