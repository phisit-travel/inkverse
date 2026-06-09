import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  const session = req.auth;
  const role = (session?.user as { role?: string } | null)?.role;
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(
        new URL(`/auth/signin?callbackUrl=/dashboard`, req.url)
      );
    }
    if (role !== "TRANSLATOR" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (pathname.startsWith("/upload")) {
    if (!session) {
      return NextResponse.redirect(
        new URL(`/auth/signin?callbackUrl=/upload`, req.url)
      );
    }
    if (role !== "TRANSLATOR" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!session || role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/upload/:path*", "/admin/:path*", "/dashboard/:path*", "/dashboard"],
};
