import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;
  const { id } = await params;

  const bill = await db.bill.findUnique({
    where: { id },
    include: {
      vendor: true,
      lines: { include: { item: true, account: { select: { id: true, name: true, code: true } } }, orderBy: { sortOrder: "asc" } },
      payments: { select: { id: true, paymentNumber: true, date: true, amount: true, method: true }, orderBy: { date: "desc" } },
    },
  });

  if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  return NextResponse.json(bill);
}
