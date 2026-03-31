import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { z } from "zod";

const createAccountSchema = z.object({
  code: z.string().max(10).optional(),
  name: z.string().min(1).max(100),
  type: z.enum([
    "BANK", "ACCOUNTS_RECEIVABLE", "OTHER_CURRENT_ASSET", "FIXED_ASSET",
    "OTHER_ASSET", "ACCOUNTS_PAYABLE", "CREDIT_CARD", "OTHER_CURRENT_LIABILITY",
    "LONG_TERM_LIABILITY", "EQUITY", "INCOME", "COST_OF_GOODS_SOLD",
    "EXPENSE", "OTHER_INCOME", "OTHER_EXPENSE",
  ]),
  detailType: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  parentId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");
  const active = searchParams.get("active");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (active !== null && active !== undefined && active !== "") {
    where.isActive = active === "true";
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  const accounts = await db.chartAccount.findMany({
    where,
    include: {
      parent: { select: { id: true, name: true, code: true } },
      children: { select: { id: true, name: true, code: true } },
    },
    orderBy: [{ code: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(accounts);
}

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db, organizationId } = result;

  const body = await request.json();
  const parsed = createAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const account = await db.chartAccount.create({
    data: {
      organizationId,
      ...parsed.data,
    },
  });

  return NextResponse.json(account, { status: 201 });
}
