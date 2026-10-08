import { NextResponse } from "next/server";
import { createProduct, listProducts } from "@/lib/data/repo";

export async function GET() {
  try {
    return NextResponse.json(await listProducts());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list products" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const category = String(body.category ?? "").trim();
    const price = Number(body.price);
    const cost = Number(body.cost ?? 0);
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";

    if (!name || !category || !Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "name, category and price are required" }, { status: 400 });
    }

    if (imageUrl && imageUrl.length > 900_000) {
      return NextResponse.json({ error: "Image is too large. Use a smaller photo." }, { status: 400 });
    }

    const product = await createProduct({
      name,
      category,
      price,
      cost: Number.isFinite(cost) ? cost : 0,
      emoji: String(body.emoji ?? "C"),
      imageUrl: imageUrl || undefined,
      description: description || undefined,
      available: body.available !== false,
      popular: Boolean(body.popular),
      modifierGroupIds: Array.isArray(body.modifierGroupIds)
        ? body.modifierGroupIds.filter((id: unknown) => typeof id === "string")
        : undefined,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create product" },
      { status: 500 },
    );
  }
}
