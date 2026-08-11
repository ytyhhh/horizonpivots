import { markPersistentSearchFailed, runPersistentSearch } from "@/lib/persistent-search";

const jobId = process.argv[2];

if (!jobId) {
  throw new Error("Usage: npm run search:worker -- <search-job-id>");
}

try {
  await runPersistentSearch(jobId);
} catch (error) {
  const message = error instanceof Error ? error.message : "Search worker failed";
  console.error(`PhD search ${jobId} failed:`, error);
  await markPersistentSearchFailed(jobId, message);
  process.exitCode = 1;
}
