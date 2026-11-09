import { NextResponse } from "next/server";
import { canUseTeam, requireAccess } from "@/lib/auth-http";
import { deleteEmployee, patchEmployee } from "@/lib/data/repo";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { error } = await requireAccess(request, canUseTeam, "Team is not available for this account");
    if (error) return error;
    const { id } = await params;
    const body = await request.json();
    const employee = await patchEmployee(id, body);
    return NextResponse.json(employee);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update employee";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { error } = await requireAccess(request, canUseTeam, "Team is not available for this account");
    if (error) return error;
    const { id } = await params;
    await deleteEmployee(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete employee";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
