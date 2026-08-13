import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
const sourcePaths: Record<string, string> = {
  "styles.css": path.join(/*turbopackIgnore: true*/ process.cwd(), "styles.css"),
  "config.js": path.join(/*turbopackIgnore: true*/ process.cwd(), "config.js"),
  "data.js": path.join(/*turbopackIgnore: true*/ process.cwd(), "data.js"),
  "clerk-adapter.js": path.join(/*turbopackIgnore: true*/ process.cwd(), "clerk-adapter.js"),
  "supabase-adapter.js": path.join(/*turbopackIgnore: true*/ process.cwd(), "supabase-adapter.js"),
  "app.js": path.join(/*turbopackIgnore: true*/ process.cwd(), "app.js"),
  "assets/campus-dining-hero.jpg": path.join(/*turbopackIgnore: true*/ process.cwd(), "assets", "campus-dining-hero.jpg"),
  "assets/course-study.jpg": path.join(/*turbopackIgnore: true*/ process.cwd(), "assets", "course-study.jpg"),
};

export async function GET(_: Request, { params }: { params: Promise<{ asset: string[] }> }) {
  const asset = (await params).asset.join("/");
  const sourcePath = sourcePaths[asset];
  if (!sourcePath) return new NextResponse("Not found", { status: 404 });

  try {
    const source = await readFile(sourcePath);
    return new NextResponse(source, {
      headers: {
        "Content-Type": contentTypes[path.extname(asset).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": asset.startsWith("assets/") ? "public, max-age=86400" : "no-store",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
