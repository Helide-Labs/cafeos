import { NextResponse } from "next/server";
import { canManageInventoryCatalog, canUseInventory, requireAccess } from "@/lib/auth-http";
import { adjustStock, deleteStock, patchStock } from "@/lib/data/repo";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const hasAdjust =
      typeof body.amount === "number" ||
      typeof body.quantity === "number" ||
      typeof body.note === "string";

    if (hasAdjust) {
      const { error } = await requireAccess(request, canUseInventory, "Inventory is not available for this account");
      if (error) return error;
      const item = await adjustStock(
        id,
        typeof body.amount === "number" ? body.amount : undefined,
        typeof body.quantity === "number" ? body.quantity : undefined,
        typeof body.note === "string" ? body.note : undefined,
      );
      return NextResponse.json(item);
    }

    const { error } = await requireAccess(
      request,
      canManageInventoryCatalog,
      "Only managers can edit stock details",
    );
    if (error) return error;
    const item = await patchStock(id, body);
    return NextResponse.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update stock";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { error } = await requireAccess(
      request,
      canManageInventoryCatalog,
      "Only managers can remove stock items",
    );
    if (error) return error;
    const { id } = await params;
    await deleteStock(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete stock item";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
