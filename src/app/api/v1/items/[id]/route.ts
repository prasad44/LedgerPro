import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

const updateItemSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sku: z.string().max(50).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  salesPrice: z.number().min(0).nullable().optional(),
  purchasePrice: z.number().min(0).nullable().optional(),
  incomeAccountId: z.string().nullable().optional(),
  expenseAccountId: z.string().nullable().optional(),
  taxable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  reorderPoint: z.number().min(0).nullable().optional(),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;
  const { id } = await params;

  const item = await db.item.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;
  const { id } = await params;

  const body = await request.json();
  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await db.item.update({ where: { id }, data: parsed.data });
  return NextResponse.json(item);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;
  const { id } = await params;

  await db.item.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
