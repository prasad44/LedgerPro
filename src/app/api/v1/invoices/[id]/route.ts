import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;
  const { id } = await params;

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      lines: {
        include: { item: true, account: { select: { id: true, name: true, code: true } } },
        orderBy: { sortOrder: "asc" },
      },
      payments: {
        select: { id: true, paymentNumber: true, date: true, amount: true, method: true },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}
