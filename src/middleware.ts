import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

// Use the lightweight auth config (no Prisma) for Edge middleware
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api/auth|api/webhooks|_next/static|_next/image|favicon.ico).*)"],
};
