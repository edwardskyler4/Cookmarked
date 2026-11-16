import { pathToFileURL } from "node:url";
import { edgeFunctions } from "./edge-functions.mjs";

const methods = {
  auth: ["POST"],
  recipe_metadata: ["POST"],
  recipes: ["GET", "POST"],
  recipes_save: ["POST"],
  temp_recipes: ["GET", "DELETE"],
};
const requestHeaders = [
  "authorization",
  "apikey",
  "content-type",
  "x-client-info",
];

export async function checkCors(projectUrl, appOrigin, fetchRequest = fetch) {
  const base = new URL(projectUrl);
  const origin = new URL(appOrigin).origin;
  if (!["http:", "https:"].includes(base.protocol))
    throw new Error("Use an HTTP(S) project URL.");
  for (const name of edgeFunctions) {
    if (!methods[name])
      throw new Error(`Define CORS probe methods for ${name}.`);
    for (const method of methods[name]) {
      const response = await fetchRequest(
        new URL(`/functions/v1/${name}`, base),
        {
          method: "OPTIONS",
          headers: {
            Origin: origin,
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": requestHeaders.join(","),
          },
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok)
        throw new Error(
          `${name}: OPTIONS returned ${response.status} ${response.headers.get("sb-error-code") ?? ""}`.trim(),
        );
      if (response.headers.get("Access-Control-Allow-Origin") !== origin)
        throw new Error(`${name}: incorrect Access-Control-Allow-Origin`);
      for (const [header, expected] of [
        ["Access-Control-Allow-Headers", requestHeaders],
        ["Access-Control-Allow-Methods", [method]],
        ["Vary", ["origin"]],
      ]) {
        const actual = (response.headers.get(header) ?? "")
          .toLowerCase()
          .split(",")
          .map((value) => value.trim());
        if (expected.some((value) => !actual.includes(value.toLowerCase())))
          throw new Error(`${name}: incomplete ${header}`);
      }
    }
  }
  return edgeFunctions;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [projectUrl, origin] = process.argv.slice(2);
  if (!projectUrl || !origin) {
    console.error("Usage: pnpm check:cors SUPABASE_URL APP_ORIGIN");
    process.exitCode = 1;
  } else {
    try {
      const checked = await checkCors(projectUrl, origin);
      console.log(`Preflight passed: ${checked.join(", ")}`);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
