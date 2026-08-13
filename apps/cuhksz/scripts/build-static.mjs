import { access, copyFile, cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.resolve(currentDirectory, "..");
const outputDirectory = path.join(appDirectory, "dist");

const staticFiles = [
  "index.html",
  "styles.css",
  "config.js",
  "data.js",
  "clerk-adapter.js",
  "supabase-adapter.js",
  "app.js",
];

await mkdir(outputDirectory, { recursive: true });

for (const file of staticFiles) {
  const source = path.join(appDirectory, file);
  await access(source);
  await copyFile(source, path.join(outputDirectory, file));
}

const assetsDirectory = path.join(appDirectory, "assets");
await access(assetsDirectory);
await cp(assetsDirectory, path.join(outputDirectory, "assets"), {
  recursive: true,
  force: true,
});

console.log(`Static site written to ${path.relative(appDirectory, outputDirectory)}/`);
