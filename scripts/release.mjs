import { spawnSync } from "node:child_process";
import { edgeFunctions } from "./edge-functions.mjs";

function run(args) {
  const result = spawnSync("pnpm", args, { stdio: "inherit" });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const target = process.argv[2];
if (!["frontend", "functions"].includes(target))
  throw new Error("Choose frontend or functions.");
const projectRef = process.env.SUPABASE_PROJECT_REF;
if (target === "functions" && !/^[a-z0-9]+$/.test(projectRef ?? ""))
  throw new Error(
    "Set SUPABASE_PROJECT_REF explicitly before releasing functions.",
  );
run(["run", "check"]);
if (target === "frontend") {
  run(["exec", "wrangler", "deploy"]);
} else {
  run(["run", "test:db"]);
  // Shared source is bundled separately into every deployed function.
  for (const name of edgeFunctions)
    run([
      "exec",
      "supabase",
      "functions",
      "deploy",
      name,
      "--project-ref",
      projectRef,
    ]);
}
