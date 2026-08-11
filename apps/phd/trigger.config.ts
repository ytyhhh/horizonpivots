import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF || "phd-scope",
  runtime: "node",
  logLevel: "log",
  maxDuration: 600,
  dirs: ["./src/trigger"],
});
