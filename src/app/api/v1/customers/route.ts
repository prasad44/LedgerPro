import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const addressSchema = z.object({
  line1: z.string().max(200).optional(),
  line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
}).optional().nullable();

const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  company: z.string().max(200).optional(),
  email: z.string().email().max(200).optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  mobile: z.string().max(30).optional(),
  fax: z.string().max(30).optional(),
  website: z.string().max(200).optional(),
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  taxId: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
  paymentTermsId: z.string().optional(),
  creditLimit: z.union([z.number(), z.string()]).optional(),
});

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");
  const active = searchParams.get("active");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  const where: Record<string, unknown> = {};
  if (active !== null && active !== undefined && active !== "") {
    where.isActive = active === "true";
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      include: {
        paymentTerms: { select: { id: true, name: true, daysUntilDue: true } },
      },
      orderBy: [{ name: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.customer.count({ where }),
  ]);

  return NextResponse.json({ customers, total, page, limit });
}

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db, organizationId } = result;

  const body = await request.json();
  const parsed = createCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { paymentTermsId, billingAddress, shippingAddress, creditLimit, email, ...rest } = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createData: Record<string, any> = {
    organizationId,
    ...rest,
  };

  // Clean up empty email to avoid unique constraint issues
  if (email && email !== "") createData.email = email;

  // Handle relation field
  if (paymentTermsId) {
    createData.paymentTerms = { connect: { id: paymentTermsId } };
  }

  // Handle JSON fields - Prisma needs explicit JsonNull for null values
  if (billingAddress !== undefined) {
    createData.billingAddress = billingAddress ?? undefined;
  }
  if (shippingAddress !== undefined) {
    createData.shippingAddress = shippingAddress ?? undefined;
  }

  // Convert creditLimit to number if string
  if (creditLimit !== undefined && creditLimit !== null) {
    createData.creditLimit = Number(creditLimit);
  }

  const customer = await db.customer.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: createData as any,
  });

  return NextResponse.json(customer, { status: 201 });
}
