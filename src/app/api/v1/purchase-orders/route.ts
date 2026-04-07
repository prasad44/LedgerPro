import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { generateDocumentNumber } from "@/lib/accounting/number-generator";
import { checkFeature } from "@/lib/subscriptions/gate";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const createPOSchema = z.object({
  vendorId: z.string(),
  date: z.string().transform((s) => new Date(s)),
  expectedDate: z.string().transform((s) => new Date(s)).optional(),
  memo: z.string().max(500).optional(),
  lines: z
    .array(
      z.object({
        itemId: z.string().optional(),
        description: z.string().max(200).optional(),
        quantity: z.number().min(0),
        unitPrice: z.number().min(0),
      })
    )
    .min(1),
});

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status");
  const vendorId = sp.get("vendorId");
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "50")));

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (vendorId) where.vendorId = vendorId;

  const [orders, total] = await Promise.all([
    db.purchaseOrder.findMany({
      where,
      include: { vendor: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.purchaseOrder.count({ where }),
  ]);

  return NextResponse.json({
    data: orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { organizationId, tier } = result;

  const featureCheck = checkFeature(tier as SubscriptionTier, "purchaseOrders");
  if (!featureCheck.allowed) {
    return NextResponse.json({ error: featureCheck.reason }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createPOSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const poNumber = await generateDocumentNumber(prisma, organizationId, "purchaseOrder");

    const lines = parsed.data.lines.map((l, i) => ({
      organizationId,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      amount: l.quantity * l.unitPrice,
      sortOrder: i,
    }));

    const subtotal = lines.reduce((s, l) => s + l.amount, 0);

    const po = await prisma.purchaseOrder.create({
      data: {
        organizationId,
        poNumber,
        vendorId: parsed.data.vendorId,
        date: parsed.data.date,
        expectedDate: parsed.data.expectedDate,
        status: "DRAFT",
        subtotal,
        taxAmount: 0,
        totalAmount: subtotal,
        memo: parsed.data.memo,
        lines: { create: lines },
      },
      include: {
        vendor: { select: { id: true, name: true } },
        lines: true,
      },
    });

    return NextResponse.json(po, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create purchase order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
