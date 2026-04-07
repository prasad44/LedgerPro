import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all organizations with the user's membership status
  const [organizations, memberships] = await Promise.all([
    prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        subscriptionTier: true,
        subscriptionStatus: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.membership.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      select: {
        organizationId: true,
        role: true,
      },
    }),
  ]);

  const membershipMap = new Map(
    memberships.map((m) => [m.organizationId, m.role])
  );

  const data = organizations.map((org) => ({
    organizationId: org.id,
    role: membershipMap.get(org.id) || null,
    isMember: membershipMap.has(org.id),
    organization: org,
  }));

  return NextResponse.json({ data });
}
