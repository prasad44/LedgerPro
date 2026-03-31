import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { z } from "zod";

const addressSchema = z.object({
  line1: z.string().max(200).optional(),
  line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
}).optional().nullable();

const updateVendorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  company: z.string().max(200).nullable().optional(),
  email: z.string().email().max(200).optional().or(z.literal("")),
  phone: z.string().max(30).nullable().optional(),
  address: addressSchema,
  taxId: z.string().max(50).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  paymentTermsId: z.string().nullable().optional(),
  is1099: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;
  const { id } = await params;

  const vendor = await db.vendor.findUnique({
    where: { id },
    include: {
      paymentTerms: { select: { id: true, name: true, daysUntilDue: true } },
      bills: {
        select: {
          id: true,
          billNumber: true,
          date: true,
          dueDate: true,
          status: true,
          totalAmount: true,
          amountDue: true,
        },
        orderBy: { date: "desc" },
        take: 20,
      },
      billPayments: {
        select: {
          id: true,
          paymentNumber: true,
          date: true,
          amount: true,
          method: true,
        },
        orderBy: { date: "desc" },
        take: 20,
      },
    },
  });

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  return NextResponse.json(vendor);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;
  const { id } = await params;

  const existing = await db.vendor.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateVendorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { paymentTermsId, address, email, ...rest } = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = { ...rest };

  // Clean up empty email
  if (email !== undefined) {
    updateData.email = email === "" ? null : email;
  }

  // Handle relation field
  if (paymentTermsId !== undefined) {
    if (paymentTermsId === null || paymentTermsId === "") {
      updateData.paymentTerms = { disconnect: true };
    } else {
      updateData.paymentTerms = { connect: { id: paymentTermsId } };
    }
  }

  // Handle JSON fields
  if (address !== undefined) {
    updateData.address = address ?? null;
  }

  const vendor = await db.vendor.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(vendor);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;
  const { id } = await params;

  const vendor = await db.vendor.findUnique({ where: { id } });
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  // Soft-delete
  await db.vendor.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
