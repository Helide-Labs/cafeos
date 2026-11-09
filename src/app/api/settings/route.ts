import { NextResponse } from "next/server";
import { canManageMenu, canUsePos, canUseSettings, requireAuth } from "@/lib/auth-http";
import { getSettings, updateSettings } from "@/lib/data/repo";

export async function GET(request: Request) {
  try {
    const { account, error } = await requireAuth(request);
    if (error) return error;
    if (!canUseSettings(account.role) && !canManageMenu(account.role) && !canUsePos(account.role)) {
      return NextResponse.json({ error: "Settings are not available for this account" }, { status: 403 });
    }
    return NextResponse.json(await getSettings());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get settings" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { account, error } = await requireAuth(request);
    if (error) return error;
    const body = await request.json();

    if (canUseSettings(account.role)) {
      return NextResponse.json(await updateSettings(body));
    }

    if (canManageMenu(account.role) && Array.isArray(body.categories)) {
      return NextResponse.json(await updateSettings({ categories: body.categories }));
    }

    return NextResponse.json({ error: "Settings are not available for this account" }, { status: 403 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update settings" },
      { status: 500 },
    );
  }
}
