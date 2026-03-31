import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth";
import { generateApiKey, AVAILABLE_SCOPES } from "@/lib/api/api-keys";
import { checkFeature } from "@/lib/subscriptions/gate";
import type { SubscriptionTier } from "@/lib/subscriptions/tiers";
import { z } from "zod";

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1),
  expiresAt: z.string().transform((s) => new Date(s)).optional(),
});

export async function GET(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const keys = await db.apiKey.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, prefix: true, scopes: true,
      lastUsedAt: true, expiresAt: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(keys);
}

export async function POST(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db, organizationId, tier } = result;

  const featureCheck = checkFeature(tier as SubscriptionTier, "apiAccess");
  if (!featureCheck.allowed) {
    return NextResponse.json({ error: featureCheck.reason }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createApiKeySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { key, hash, prefix } = generateApiKey();

  const apiKey = await db.apiKey.create({
    data: {
      organizationId,
      name: parsed.data.name,
      keyHash: hash,
      prefix,
      scopes: parsed.data.scopes,
      expiresAt: parsed.data.expiresAt,
    },
    select: { id: true, name: true, prefix: true, scopes: true, createdAt: true },
  });

  // Return the full key ONCE — it can never be retrieved again
  return NextResponse.json({ ...apiKey, key }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const result = await withAuth();
  if ("error" in result) return result.error;
  const { db } = result;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.apiKey.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
