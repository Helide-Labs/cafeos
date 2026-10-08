import { NextResponse } from "next/server";
import { deleteRecipe, listRecipes, upsertRecipe } from "@/lib/data/repo";
import type { Recipe } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await listRecipes());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list recipes" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const productId = String(body.productId ?? "").trim();
    const lines = Array.isArray(body.lines) ? body.lines : null;

    if (!productId || !lines) {
      return NextResponse.json({ error: "productId and lines are required" }, { status: 400 });
    }

    const recipe = await upsertRecipe({
      productId,
      lines,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    } as Recipe);

    return NextResponse.json(recipe);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upsert recipe";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const productId = new URL(request.url).searchParams.get("productId")?.trim();
    if (!productId) {
      return NextResponse.json({ error: "productId query parameter is required" }, { status: 400 });
    }
    await deleteRecipe(productId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete recipe";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
