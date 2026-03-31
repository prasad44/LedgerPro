import { auth } from "@/lib/auth/auth";

export default auth;

export const config = {
  matcher: ["/((?!api/webhooks|_next/static|_next/image|favicon.ico).*)"],
};
