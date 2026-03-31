import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      organizationSlug: string;
      role: string;
      subscriptionTier: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    organizationId: string;
    organizationSlug: string;
    role: string;
    subscriptionTier: string;
  }
}
