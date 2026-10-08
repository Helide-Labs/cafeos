import { NextResponse } from "next/server";
import { createModifierGroup, listModifierGroups } from "@/lib/data/repo";
import type { ModifierGroup } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json(await listModifierGroups());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list modifiers" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();

    if (!name || !Array.isArray(body.options)) {
      return NextResponse.json({ error: "name and options are required" }, { status: 400 });
    }

    const group = await createModifierGroup({
      name,
      single: Boolean(body.single),
      options: body.options,
      appliesTo: Array.isArray(body.appliesTo) ? body.appliesTo : [],
    } as Omit<ModifierGroup, "id">);

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create modifier group" },
      { status: 500 },
    );
  }
}
