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

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id: paramId } = await params;
    const url = new URL(request.url);
    const pathId = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
    const id = (paramId || pathId).trim();
    const name = url.searchParams.get("name")?.trim() || undefined;
    await deleteModifierGroup(id, name);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete modifier group";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
