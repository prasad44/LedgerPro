import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { JournalEntryService } from "@/lib/accounting/journal-entry.service";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { organizationId } = result;
  const { id } = await params;

  const service = new JournalEntryService(prisma, organizationId);
  const entry = await service.getById(id);

  if (!entry) {
    return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
  }

  return NextResponse.json(entry);
}
