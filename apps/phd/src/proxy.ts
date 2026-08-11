import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const protectedRoutes = createRouteMatcher(["/api/search-jobs(.*)", "/api/profile(.*)", "/api/shortlist(.*)", "/api/drafts(.*)", "/api/resumes(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (protectedRoutes(request)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
