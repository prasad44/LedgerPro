import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const publicPaths = ["/login", "/register", "/forgot-password", "/api/webhooks", "/"];
      const isPublic = publicPaths.some(
        (path) => nextUrl.pathname === path || nextUrl.pathname.startsWith(path + "/")
      );

      // Special case: root path is public (landing page)
      if (nextUrl.pathname === "/") return true;

      // Webhook endpoints are always public
      if (nextUrl.pathname.startsWith("/api/webhooks")) return true;

      if (!isPublic) {
        if (isLoggedIn) return true;
        return false; // redirect to login
      }

      // Redirect logged-in users away from auth pages
      if (
        isLoggedIn &&
        (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")
      ) {
        return Response.redirect(new URL("/select-org", nextUrl));
      }

      return true;
    },
  },
  providers: [],
};
