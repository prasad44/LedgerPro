import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const OrgRoleEnum = z.enum([
  "OWNER",
  "ADMIN",
  "ACCOUNTANT",
  "ACCOUNTS_PAYABLE",
  "ACCOUNTS_RECEIVABLE",
  "BANKING",
  "SALES",
  "PURCHASING",
  "VIEWER",
  "MEMBER",
]);

const updateMembershipSchema = z.object({
  role: OrgRoleEnum.optional(),
  isActive: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = session.user.organizationId;
  const { id } = await params;

  const callerMembership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId,
      },
    },
  });

  if (!callerMembership || !["OWNER", "ADMIN"].includes(callerMembership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateMembershipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Fetch the target membership and verify it belongs to the same org
  const targetMembership = await prisma.membership.findUnique({
    where: { id },
  });

  if (!targetMembership || targetMembership.organizationId !== organizationId) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  // Cannot change the OWNER's role or deactivate the OWNER
  if (targetMembership.role === "OWNER") {
    if (parsed.data.role && parsed.data.role !== "OWNER") {
      return NextResponse.json(
        { error: "Cannot change the owner's role" },
        { status: 403 }
      );
    }
    if (parsed.data.isActive === false) {
      return NextResponse.json(
        { error: "Cannot deactivate the organization owner" },
        { status: 403 }
      );
    }
  }

  // Cannot assign OWNER role to anyone
  if (parsed.data.role === "OWNER") {
    return NextResponse.json(
      { error: "Cannot assign OWNER role. Each organization can only have one owner." },
      { status: 400 }
    );
  }

  // ADMIN cannot change another ADMIN's role (only OWNER can)
  if (
    callerMembership.role === "ADMIN" &&
    targetMembership.role === "ADMIN" &&
    parsed.data.role
  ) {
    return NextResponse.json(
      { error: "Only the owner can change an admin's role" },
      { status: 403 }
    );
  }

  // Cannot change own role (prevent self-demotion)
  if (targetMembership.userId === session.user.id && parsed.data.role) {
    return NextResponse.json(
      { error: "Cannot change your own role" },
      { status: 403 }
    );
  }

  const updated = await prisma.membership.update({
    where: { id },
    data: parsed.data,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json({
    id: updated.id,
    role: updated.role,
    isActive: updated.isActive,
    invitedAt: updated.invitedAt,
    joinedAt: updated.joinedAt,
    user: updated.user,
  });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = session.user.organizationId;
  const { id } = await params;

  const callerMembership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId,
      },
    },
  });

  if (!callerMembership || !["OWNER", "ADMIN"].includes(callerMembership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetMembership = await prisma.membership.findUnique({
    where: { id },
  });

  if (!targetMembership || targetMembership.organizationId !== organizationId) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  // Cannot delete the OWNER membership
  if (targetMembership.role === "OWNER") {
    return NextResponse.json(
      { error: "Cannot remove the organization owner" },
      { status: 403 }
    );
  }

  // Cannot delete own membership
  if (targetMembership.userId === session.user.id) {
    return NextResponse.json(
      { error: "Cannot remove yourself from the organization" },
      { status: 403 }
    );
  }

  await prisma.membership.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
