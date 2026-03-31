import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";
import { authConfig } from "./auth.config";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      async authorize(credentials) {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(8),
          })
          .safeParse(credentials);

        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id as string;
      }

      if (trigger === "signIn" || trigger === "update") {
        const userId = token.userId as string;

        // Allow switching org via session update
        const targetOrgId =
          trigger === "update" &&
          session &&
          typeof session === "object" &&
          "organizationId" in session
            ? (session.organizationId as string)
            : undefined;

        const membership = targetOrgId
          ? await prisma.membership.findUnique({
              where: {
                userId_organizationId: {
                  userId,
                  organizationId: targetOrgId,
                },
              },
              include: { organization: true },
            })
          : await prisma.membership.findFirst({
              where: { userId, isActive: true },
              orderBy: { invitedAt: "asc" },
              include: { organization: true },
            });

        if (membership) {
          token.organizationId = membership.organizationId;
          token.organizationSlug = membership.organization.slug;
          token.role = membership.role;
          token.subscriptionTier = membership.organization.subscriptionTier;
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.organizationId = token.organizationId as string;
      session.user.organizationSlug = token.organizationSlug as string;
      session.user.role = token.role as string;
      session.user.subscriptionTier = token.subscriptionTier as string;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      const orgName = user.name ? `${user.name}'s Company` : "My Company";
      const slug = `org-${user.id.slice(0, 8)}`;

      await prisma.organization.create({
        data: {
          name: orgName,
          slug,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          members: {
            create: {
              userId: user.id,
              role: "OWNER",
              joinedAt: new Date(),
            },
          },
        },
      });
    },
  },
});
