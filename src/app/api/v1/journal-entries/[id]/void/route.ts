import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { JournalEntryService } from "@/lib/accounting/journal-entry.service";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { organizationId } = result;
  const { id } = await params;

  try {
    const service = new JournalEntryService(prisma, organizationId);
    const entry = await service.void(id);
    return NextResponse.json(entry);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to void journal entry";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
