import { NextResponse } from "next/server";
import { createCustomer, listCustomers } from "@/lib/data/repo";
import type { Customer } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await listCustomers());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list customers" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const customer = await createCustomer({
      name,
      email: typeof body.email === "string" ? body.email : undefined,
      phone: typeof body.phone === "string" ? body.phone : undefined,
      favorite: typeof body.favorite === "string" ? body.favorite : undefined,
      segment: body.segment as Customer["segment"] | undefined,
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create customer" },
      { status: 500 },
    );
  }
}
