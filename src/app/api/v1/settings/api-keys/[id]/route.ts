import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;
  const { id } = await params;

  const apiKey = await db.apiKey.findUnique({ where: { id } });
  if (!apiKey) return NextResponse.json({ error: "API key not found" }, { status: 404 });

  await db.apiKey.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
