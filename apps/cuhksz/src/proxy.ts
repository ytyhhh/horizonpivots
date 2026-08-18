import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk must run before server-side route handlers can read the shared
// Horizon Pivots session cookie with auth(). Routes stay publicly reachable;
// individual handlers decide when login is required.
export default clerkMiddleware();

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
