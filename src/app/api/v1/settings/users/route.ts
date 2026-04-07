import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

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

const ROLE_PRIORITY: Record<string, number> = {
  OWNER: 0,
  ADMIN: 1,
  ACCOUNTANT: 2,
  ACCOUNTS_PAYABLE: 3,
  ACCOUNTS_RECEIVABLE: 4,
  BANKING: 5,
  SALES: 6,
  PURCHASING: 7,
  VIEWER: 8,
  MEMBER: 9,
};

const addUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200).optional(),
  password: z.string().min(8).max(100).optional(),
  role: OrgRoleEnum,
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = session.user.organizationId;

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

  const memberships = await prisma.membership.findMany({
    where: { organizationId },
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

  // Sort by role priority (OWNER first), then alphabetically by name
  const sorted = memberships.sort((a, b) => {
    const roleDiff = (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99);
    if (roleDiff !== 0) return roleDiff;
    const nameA = (a.user.name ?? a.user.email).toLowerCase();
    const nameB = (b.user.name ?? b.user.email).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const data = sorted.map((m) => ({
    id: m.id,
    role: m.role,
    isActive: m.isActive,
    invitedAt: m.invitedAt,
    joinedAt: m.joinedAt,
    user: m.user,
  }));

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = session.user.organizationId;

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
  const parsed = addUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, name, password, role } = parsed.data;

  if (role === "OWNER") {
    return NextResponse.json(
      { error: "Cannot assign OWNER role. Each organization can only have one owner." },
      { status: 400 }
    );
  }

  // Check if user already exists
  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // Check if membership already exists for this org
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 409 }
      );
    }
  } else {
    // Create new user
    const defaultName = name ?? email.split("@")[0];
    const rawPassword = password ?? "12345678";
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    user = await prisma.user.create({
      data: {
        email,
        name: defaultName,
        passwordHash,
      },
    });
  }

  // Create membership
  const membership = await prisma.membership.create({
    data: {
      userId: user.id,
      organizationId,
      role,
      joinedAt: new Date(),
    },
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

  return NextResponse.json(
    {
      id: membership.id,
      role: membership.role,
      isActive: membership.isActive,
      invitedAt: membership.invitedAt,
      joinedAt: membership.joinedAt,
      user: membership.user,
    },
    { status: 201 }
  );
}
