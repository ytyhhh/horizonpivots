/* eslint-disable @next/next/no-sync-scripts */

import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const legacyDocumentPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "index.html");

function pageMarkup(document: string) {
  const body = document.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? "";
  return body.replace(/\s*<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

export default async function HomePage() {
  const document = await readFile(legacyDocumentPath, "utf8");

  return (
    <>
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: pageMarkup(document) }} />
      <script src="/config.js" />
      <script src="/data.js" />
      <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" />
      <script src="/clerk-adapter.js" />
      <script src="/supabase-adapter.js" />
      <script src="/app.js" />
    </>
  );
}
