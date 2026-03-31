import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { InvoiceService } from "@/lib/accounting/invoice.service";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { organizationId } = result;
  const { id } = await params;

  try {
    const service = new InvoiceService(prisma, organizationId);
    const invoice = await service.voidInvoice(id);
    return NextResponse.json(invoice);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to void invoice";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
