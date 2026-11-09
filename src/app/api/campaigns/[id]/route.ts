import { NextResponse } from "next/server";
import { canUseCampaigns, requireAccess } from "@/lib/auth-http";
import { deleteCampaign, patchCampaign } from "@/lib/data/repo";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { error } = await requireAccess(request, canUseCampaigns, "Campaigns are not available for this account");
    if (error) return error;
    const { id } = await params;
    await deleteCampaign(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete campaign";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { error } = await requireAccess(request, canUseCampaigns, "Campaigns are not available for this account");
    if (error) return error;
    const { id } = await params;
    const body = await request.json();
    const campaign = await patchCampaign(id, body);
    return NextResponse.json(campaign);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update campaign";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
