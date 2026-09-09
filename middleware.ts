import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/admin/login";

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/admin/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    const adminUrl = new URL("/admin", req.nextUrl.origin);
    return NextResponse.redirect(adminUrl);
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
