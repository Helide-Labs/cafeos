import { NextResponse } from "next/server";
import { createOrder, listOrders } from "@/lib/data/repo";
import type { CartItem, Order } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await listOrders());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list orders" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cart = (body.cart ?? []) as CartItem[];
    const type = (body.type ?? "Dine in") as Order["type"];
    const customer = String(body.customer ?? "Walk-in").trim() || "Walk-in";

    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: "cart is required" }, { status: 400 });
    }

    const order = await createOrder({
      cart,
      type,
      customer,
      customerId: typeof body.customerId === "string" ? body.customerId : undefined,
      subtotal: typeof body.subtotal === "number" ? body.subtotal : undefined,
      tax: typeof body.tax === "number" ? body.tax : undefined,
      serviceCharge: typeof body.serviceCharge === "number" ? body.serviceCharge : undefined,
      discount: typeof body.discount === "number" ? body.discount : undefined,
      tip: typeof body.tip === "number" ? body.tip : undefined,
      paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod : undefined,
      amountTendered: typeof body.amountTendered === "number" ? body.amountTendered : undefined,
      changeDue: typeof body.changeDue === "number" ? body.changeDue : undefined,
      pointsRedeemed: typeof body.pointsRedeemed === "number" ? body.pointsRedeemed : undefined,
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create order" },
      { status: 500 },
    );
  }
}
