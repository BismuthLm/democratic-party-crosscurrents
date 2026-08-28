import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export async function computeReleaseIdentity({ root, core, legacy, fecSources }) {
  const generatorPaths = [
    join(root, "scripts/build-data.mjs"),
    join(root, "scripts/lib/model.mjs"),
    join(root, "scripts/lib/taxonomy.mjs"),
    join(root, "scripts/lib/xlsx.mjs"),
    fileURLToPath(import.meta.url),
  ];
  const releaseInput = [
    JSON.stringify(core),
    JSON.stringify(legacy),
    JSON.stringify(fecSources),
    ...await Promise.all(generatorPaths.map((path) => readFile(path, "utf8"))),
  ].join("\n");
  const fingerprint = createHash("sha256").update(releaseInput).digest("hex").slice(0, 12);
  const generatedOn = String(legacy.meta?.generatedOn ?? core.generatedOn);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(generatedOn)) throw new Error(`Invalid release generation date: ${generatedOn}`);
  const releaseId = process.env.WORKBENCH_RELEASE_ID || `${generatedOn}-v3-${fingerprint}`;
  if (!/^[A-Za-z0-9._-]+$/.test(releaseId)) throw new Error(`Unsafe release ID: ${releaseId}`);
  return { releaseId, generatedOn, fingerprint };
}
