import { NextResponse } from "next/server";
import { canRefund, canUseOrders, requireAccess } from "@/lib/auth-http";
import { advanceOrder, refundOrder } from "@/lib/data/repo";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (body.refund) {
      const { error } = await requireAccess(request, canRefund, "Refunds are not available for this account");
      if (error) return error;
      return NextResponse.json(await refundOrder(id));
    }
    if (body.advance) {
      const { error } = await requireAccess(request, canUseOrders, "Orders are not available for this account");
      if (error) return error;
      return NextResponse.json(await advanceOrder(id));
    }
    return NextResponse.json({ error: "refund or advance is required" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update order";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
