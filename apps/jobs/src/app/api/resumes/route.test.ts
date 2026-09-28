import { describe, expect, it } from "vitest";
import { POST } from "./route";
import { GET as getParseJob } from "./[parseJobId]/route";

describe("disabled resume parsing API", () => {
  it("rejects uploads without reading the request body", async () => {
    const response = await POST();
    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({ code: "RESUME_UPLOAD_DISABLED" });
  });

  it("does not expose old parse-job status", async () => {
    const response = await getParseJob();
    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({ code: "RESUME_PARSING_DISABLED" });
  });
});
