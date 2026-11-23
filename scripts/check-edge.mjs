import { spawnSync } from "node:child_process";
import { edgeFunctions, functionsDirectory } from "./edge-functions.mjs";

for (const name of edgeFunctions) {
  const result = spawnSync(
    "deno",
    [
      "check",
      "--frozen",
      "--config",
      `${functionsDirectory}/${name}/deno.json`,
      `${functionsDirectory}/${name}/index.ts`,
    ],
    { stdio: "inherit" },
  );
  if (result.error)
    console.error(
      "Deno 2.5.6 is required for Edge Function checks. See README.md.",
    );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
