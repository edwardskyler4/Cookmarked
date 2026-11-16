import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const temporary: string[] = [];
afterEach(() => {
  for (const directory of temporary.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function release(target: string, failure = "") {
  const directory = mkdtempSync(join(tmpdir(), "cookmarked-release-"));
  temporary.push(directory);
  const log = join(directory, "commands.jsonl");
  const fake = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TEST_RELEASE_LOG, JSON.stringify({ command: require('node:path').basename(process.argv[1]), args })+'\\n');
if (args[0] === 'run' && args[1] === process.env.TEST_RELEASE_FAILURE) process.exit(7);
`;
  for (const command of ["pnpm", "wrangler"])
    writeFileSync(join(directory, command), fake, { mode: 0o755 });
  // Execute the package script directly so package-manager PATH rewriting cannot
  // put a real deployment binary ahead of our fakes.
  const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
  const result = spawnSync("/bin/sh", ["-c", scripts[target] ?? "exit 99"], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${directory}:${process.env.PATH}`,
      SUPABASE_PROJECT_REF: "testproject",
      TEST_RELEASE_LOG: log,
      TEST_RELEASE_FAILURE: failure,
    },
  });
  const commands = existsSync(log)
    ? readFileSync(log, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line))
    : [];
  return { result, commands };
}

describe("release safety", () => {
  it("blocks frontend deployment when validation fails", () => {
    const { result, commands } = release("deploy", "check");
    expect(result.status).toBe(7);
    expect(commands).toEqual([{ command: "pnpm", args: ["run", "check"] }]);
  });

  it("blocks function deployment when database tests fail", () => {
    const { result, commands } = release("deploy:functions", "test:db");
    expect(result.status).toBe(7);
    expect(commands).toEqual([
      { command: "pnpm", args: ["run", "check"] },
      { command: "pnpm", args: ["run", "test:db"] },
    ]);
  });

  it("releases every current function only after validation", () => {
    const { result, commands } = release("deploy:functions");
    expect(result.status, result.stderr).toBe(0);
    expect(commands.slice(0, 2).map((command) => command.args)).toEqual([
      ["run", "check"],
      ["run", "test:db"],
    ]);
    expect(commands.slice(2).map((command) => command.args)).toEqual(
      [
        "auth",
        "recipe_metadata",
        "recipes",
        "recipes_save",
        "temp_recipes",
      ].map((name) => [
        "exec",
        "supabase",
        "functions",
        "deploy",
        name,
        "--project-ref",
        "testproject",
      ]),
    );
    expect(commands.some((command) => command.args.includes("push"))).toBe(
      false,
    );
  });
});
