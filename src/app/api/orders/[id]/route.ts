import { NextResponse } from "next/server";
import { advanceOrder, refundOrder } from "@/lib/data/repo";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (body.refund) {
      return NextResponse.json(await refundOrder(id));
    }
    if (body.advance) {
      return NextResponse.json(await advanceOrder(id));
    }
    return NextResponse.json({ error: "refund or advance is required" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update order";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
