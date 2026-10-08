import { NextResponse } from "next/server";
import { deleteCampaign, patchCampaign } from "@/lib/data/repo";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  try {
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
