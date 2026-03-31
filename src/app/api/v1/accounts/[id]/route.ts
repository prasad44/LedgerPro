import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { z } from "zod";

const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().max(10).optional(),
  description: z.string().max(500).optional(),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  detailType: z.string().max(50).optional(),
  taxLineMapping: z.string().max(100).nullable().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;
  const { id } = await params;

  const account = await db.chartAccount.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, name: true, code: true } },
      children: {
        select: { id: true, name: true, code: true, type: true, balance: true, isActive: true },
        orderBy: { code: "asc" },
      },
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json(account);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;
  const { id } = await params;

  const existing = await db.chartAccount.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Prevent changing the type of system accounts
  if (existing.isSystemAccount && parsed.data.isActive === false) {
    return NextResponse.json(
      { error: "System accounts cannot be deactivated" },
      { status: 400 }
    );
  }

  const account = await db.chartAccount.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(account);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;
  const { id } = await params;

  const account = await db.chartAccount.findUnique({ where: { id } });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (account.isSystemAccount) {
    return NextResponse.json(
      { error: "System accounts cannot be deleted" },
      { status: 400 }
    );
  }

  // Soft-delete
  await db.chartAccount.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
