import { task } from "@trigger.dev/sdk/v3";
import { searchQuerySchema } from "@/lib/schema";
import { runPersistentSearch } from "@/lib/persistent-search";

const payloadSchema = searchQuerySchema.extend({
  jobId: searchQuerySchema.shape.profileId.uuid(),
  userId: searchQuerySchema.shape.profileId,
  query: searchQuerySchema,
});

export const institutionScopedSearch = task({
  id: "institution-scoped-search",
  maxDuration: 600,
  run: async (payload: unknown) => {
    const input = payloadSchema.parse(payload);
    await runPersistentSearch(input.jobId);
    return { jobId: input.jobId };
  },
});
