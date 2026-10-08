import { NextResponse } from "next/server";
import { createFeedback, listFeedback } from "@/lib/data/repo";

export async function GET() {
  try {
    return NextResponse.json(await listFeedback());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list feedback" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customerName = String(body.customerName ?? "").trim();
    const rating = Number(body.rating);

    if (!customerName || !Number.isFinite(rating)) {
      return NextResponse.json({ error: "customerName and rating are required" }, { status: 400 });
    }

    const feedback = await createFeedback({
      customerName,
      rating,
      comment: typeof body.comment === "string" ? body.comment : undefined,
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create feedback" },
      { status: 500 },
    );
  }
}
