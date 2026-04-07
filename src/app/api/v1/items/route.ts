import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { z } from "zod";

const createItemSchema = z.object({
  name: z.string().min(1).max(100),
  sku: z.string().max(50).optional(),
  type: z.enum(["SERVICE", "INVENTORY", "NON_INVENTORY", "BUNDLE", "GROUP"]).default("SERVICE"),
  description: z.string().max(500).optional(),
  salesPrice: z.number().min(0).optional(),
  purchasePrice: z.number().min(0).optional(),
  incomeAccountId: z.string().optional(),
  expenseAccountId: z.string().optional(),
  assetAccountId: z.string().optional(),
  taxable: z.boolean().default(true),
  trackInventory: z.boolean().default(false),
  reorderPoint: z.number().min(0).optional(),
});

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const sp = request.nextUrl.searchParams;
  const type = sp.get("type");
  const active = sp.get("active");
  const search = sp.get("search");

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (active !== null && active !== undefined && active !== "") where.isActive = active === "true";
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }

  const items = await db.item.findMany({
    where,
    orderBy: [{ name: "asc" }],
  });

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db, organizationId } = result;

  const body = await request.json();
  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await db.item.create({
    data: { organizationId, ...parsed.data },
  });

  return NextResponse.json(item, { status: 201 });
}
