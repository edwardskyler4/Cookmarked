import { describe, expect, it } from "vitest";
import { saveUser } from "../../src/services/saveUser";
import type { UserRepository } from "../../src/domain/repositories/UserRepository";

describe("saveUser", () => {
  it("saves a username and returns the saved user", async () => {
    const savedUsers: string[] = [];
    const repository: UserRepository = {
      async save(username) {
        savedUsers.push(username);
        return { id: 1, username };
      },
    };

    const result = await saveUser(repository, "Evan");

    expect(savedUsers).toEqual(["Evan"]);
    expect(result).toEqual({ id: 1, username: "Evan" });
  });

  it("propagates a repository failure to the caller", async () => {
    const failure = new Error("The database is unavailable.");
    const repository: UserRepository = {
      async save() {
        throw failure;
      },
    };

    await expect(saveUser(repository, "Evan")).rejects.toBe(failure);
  });
});
