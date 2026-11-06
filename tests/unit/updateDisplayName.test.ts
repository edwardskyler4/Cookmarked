import { describe, expect, it } from "vitest";
import { updateDisplayName } from "../../src/services/updateDisplayName";
import type { ProfileRepository } from "../../src/domain/repositories/ProfileRepository";

describe("updateDisplayName", () => {
  it("trims and saves a non-empty display name", async () => {
    const saved: string[] = [];
    const repository: ProfileRepository = {
      updateFirstName: async (firstName) => {
        saved.push(firstName);
        return { firstName };
      },
    };

    const result = await updateDisplayName(repository, "  Kyler  ");

    expect(saved).toEqual(["Kyler"]);
    expect(result.firstName).toBe("Kyler");
  });

  it("rejects a blank display name", async () => {
    const repository: ProfileRepository = {
      updateFirstName: async (firstName) => ({ firstName }),
    };

    await expect(updateDisplayName(repository, "   ")).rejects.toThrow(
      "Display name cannot be blank",
    );
  });
});
