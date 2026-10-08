import { NextResponse } from "next/server";
import { deleteModifierGroup, patchModifierGroup } from "@/lib/data/repo";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const group = await patchModifierGroup(id, body);
    return NextResponse.json(group);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update modifier group";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    await deleteModifierGroup(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete modifier group";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
