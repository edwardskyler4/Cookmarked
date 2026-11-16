import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const functionsDirectory = fileURLToPath(
  new URL("../supabase/functions/", import.meta.url),
);
export const edgeFunctions = readdirSync(functionsDirectory, {
  withFileTypes: true,
})
  .filter(
    (entry) =>
      entry.isDirectory() &&
      !entry.name.startsWith("_") &&
      existsSync(`${functionsDirectory}/${entry.name}/index.ts`),
  )
  .map((entry) => entry.name)
  .sort();
