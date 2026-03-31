import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { BillService } from "@/lib/accounting/bill.service";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { organizationId } = result;
  const { id } = await params;

  try {
    const service = new BillService(prisma, organizationId);
    const bill = await service.post(id);
    return NextResponse.json(bill);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 400 });
  }
}
