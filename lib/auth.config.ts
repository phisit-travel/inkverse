import type { NextAuthConfig } from "next-auth";

// Edge-safe config — no Prisma, no native modules.
// Used by middleware and merged into the full auth.ts config.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
        // Our unique handle for profile URLs. Google sets `name` to the display
        // name, so we must carry `username` explicitly (credentials sets name =
        // username, so fall back to it).
        token.username =
          (user as { username?: string }).username ?? user.name ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string; id?: string }).role =
          token.role as string;
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { username?: string }).username =
          token.username as string;
      }
      return session;
    },
  },
};
