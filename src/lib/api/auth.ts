import { auth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db/tenant";

export async function withAuth() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const db = getTenantDb(session.user.organizationId);

  return {
    session,
    db,
    organizationId: session.user.organizationId,
    userId: session.user.id,
    tier: session.user.subscriptionTier,
    role: session.user.role,
  };
}
