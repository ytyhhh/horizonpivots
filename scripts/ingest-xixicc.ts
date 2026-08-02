import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import { fetchXixiccJobs, toJobRow } from "../src/lib/ingestion/xixicc";
import { syncJobEmbeddings } from "../src/lib/vector-sync";

loadEnvConfig(process.cwd());

async function main() {
  const jobs = await fetchXixiccJobs();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          fetched: jobs.length,
          sample: jobs.slice(0, 3),
        },
        null,
        2,
      ),
    );
    return;
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let upserted = 0;
  for (let index = 0; index < jobs.length; index += 100) {
    const { data, error } = await supabase
      .from("jobs")
      .upsert(jobs.slice(index, index + 100).map(toJobRow), {
        onConflict: "fingerprint",
      })
      .select("id");
    if (error) throw error;
    upserted += data?.length ?? 0;
  }
  let embeddings = { attempted: 0, updated: 0 };
  try {
    embeddings = await syncJobEmbeddings(supabase, jobs);
  } catch (error) {
    console.error("Embedding sync failed; jobs were still saved:", error);
  }
  console.log(JSON.stringify({ fetched: jobs.length, upserted, embeddings }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
