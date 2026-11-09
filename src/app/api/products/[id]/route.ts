import { NextResponse } from "next/server";
import { canManageMenu, requireAccess } from "@/lib/auth-http";
import { deleteProduct, patchProduct } from "@/lib/data/repo";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { error } = await requireAccess(request, canManageMenu, "Menu editing is not available for this account");
    if (error) return error;
    const { id } = await params;
    const body = await request.json();
    const product = await patchProduct(id, body);
    return NextResponse.json(product);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update product";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { error } = await requireAccess(request, canManageMenu, "Menu editing is not available for this account");
    if (error) return error;
    const { id } = await params;
    await deleteProduct(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete product";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
